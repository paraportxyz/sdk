import { BaseManager } from '@/base/BaseManager'
import { GenericEmitter } from '@/base/GenericEmitter'
import type BridgeRegistry from '@/bridges/BridgeRegistry'
import { TransactionManager } from '@/managers/TransactionManager'
import BalanceService from '@/services/BalanceService'
import type { Logger } from '@/services/LoggerService'
import type PolkadotApi from '@/services/PolkadotApi'
import type { Quote } from '@/types/common'
import {
	type TeleportDetails,
	type TeleportEvent,
	type TeleportEventPayload,
	type TeleportEventType,
	TeleportEventTypes,
	type TeleportParams,
	type TeleportStatus,
	TeleportStatuses,
} from '@/types/teleport'
import {
	type TransactionCallback,
	type TransactionDetails,
	type TransactionEventType,
	TransactionEventTypes,
	TransactionStatuses,
	type TransactionType,
	TransactionTypes,
} from '@/types/transactions'

/**
 * Orchestrates teleport lifecycle and related transactions.
 *
 * Accepts quotes and parameters, creates teleport records, sequences
 * underlying transactions via TransactionManager, and emits teleport events
 * as the state progresses.
 */
export class TeleportManager extends BaseManager<
	TeleportDetails,
	TeleportStatus,
	TeleportEvent,
	TeleportEventType,
	TeleportEventPayload,
	{ checked?: boolean }
> {
	private readonly transactionManager: TransactionManager
	private readonly balanceService: BalanceService
	private readonly unsubs: Array<() => void> = []

	private readonly statusActionMap: Partial<
		Record<TeleportStatus, (teleport: TeleportDetails) => Promise<void>>
	> = {
		[TeleportStatuses.Pending]: async (teleport) => {
			const pendingTransaction = this.findNextPendingTransaction(teleport)
			if (pendingTransaction) {
				return this.executeTeleportTransaction(pendingTransaction)
			}
		},
		[TeleportStatuses.Waiting]: async (teleport) =>
			this.checkForFunds(teleport),
	}

	constructor(
		teleportEventEmitter: GenericEmitter<
			TeleportEventPayload,
			TeleportEventType
		>,
		private readonly bridgeRegistry: BridgeRegistry,
		private readonly subApi: PolkadotApi,
		private readonly logger: Logger,
	) {
		super(teleportEventEmitter)
		this.transactionManager = new TransactionManager(
			new GenericEmitter<TransactionDetails, TransactionEventType>(),
		)
		this.balanceService = new BalanceService(this.subApi, this.logger)

		this.registerListeners()
	}

	// --------------------------
	// Public API Methods
	// --------------------------

	/**
	 * Creates a new teleport in Pending status and stores it.
	 *
	 * @param params - Original teleport parameters
	 * @param quote - Selected quote used for execution
	 * @returns Created teleport record
	 */
	async createTeleport(
		params: TeleportParams,
		quote: Quote,
	): Promise<TeleportDetails> {
		const teleportId = crypto.randomUUID() as string

		const teleport: TeleportDetails = {
			id: teleportId,
			status: TeleportStatuses.Pending,
			details: {
				address: params.address,
				amount: quote.total,
				receiveAmount: quote.amount,
				asset: quote.asset,
				route: quote.route,
			},
			events: [],
			timestamp: Date.now(),
			checked: false,
		}

		this.setItem(teleportId, teleport, false)

		return teleport
	}

	/**
	 * Initializes and starts execution of a teleport by creating its
	 * transaction sequence and emitting initial events.
	 *
	 * @param teleport - Teleport created via createTeleport
	 * @param params - Original teleport params
	 * @param quote - Selected quote
	 */
	initiateTeleport(
		teleport: TeleportDetails,
		params: TeleportParams,
		quote: Quote,
	) {
		this.createTelportTransactions(params, quote, teleport.id)

		this.startTeleport(teleport)
	}

	/**
	 * Retries a failed teleport by resetting failed transactions and
	 * resuming the processing pipeline.
	 *
	 * @param teleportId - ID of the failed teleport
	 * @throws Error If teleport is not found or not in Failed status
	 */
	retryTeleport(teleportId: string) {
		const teleport = this.getItem(teleportId)

		if (!teleport) {
			throw new Error('Teleport not found')
		}

		if (teleport.status !== TeleportStatuses.Failed) {
			throw new Error('Only failed teleports can be retried')
		}

		this.logger.debug(`Retrying failed teleport: ${teleportId}`)

		const teleportTransactions = this.transactionManager.getItemsWhere(
			(transaction) => transaction.teleportId === teleportId,
		)

		for (const transaction of teleportTransactions) {
			if (this.transactionManager.isTransactionFailed(transaction)) {
				this.transactionManager.resetTransaction(transaction)
			}
		}

		this.updateStatus(teleport.id, TeleportStatuses.Pending)

		this.processNextStep(teleport)
	}

	/**
	 * Picks the best quote by minimizing total fees.
	 *
	 * @param quotes - Available quotes
	 * @returns Best quote or undefined when none
	 */
	selectBestQuote(quotes: Quote[]): Quote | undefined {
		return quotes.reduce<Quote | undefined>((best, quote) => {
			if (!best || Number(quote.fees.total) < Number(best.fees.total)) {
				return quote
			}
			return best
		}, undefined)
	}

	// --------------------------
	// Event Handlers
	// --------------------------

	private registerListeners() {
		/**
		 * Subscribe to teleport events.
		 **/
		this.unsubs.push(
			this.subscribe(TeleportEventTypes.TELEPORT_STARTED, (teleport) => {
				this.logger.debug(
					`[${TeleportEventTypes.TELEPORT_STARTED}] ${teleport.id}`,
				)

				this.processNextStep(teleport)
			}),
		)

		this.unsubs.push(
			this.subscribe(TeleportEventTypes.TELEPORT_UPDATED, async (teleport) => {
				this.logger.debug(
					`[${TeleportEventTypes.TELEPORT_UPDATED}] ${teleport.status}`,
					teleport,
				)

				if (teleport.status === TeleportStatuses.Failed) return

				if (teleport.status === TeleportStatuses.Completed) {
					return this.eventEmitter.emit({
						type: TeleportEventTypes.TELEPORT_COMPLETED,
						payload: teleport,
					})
				}

				this.processNextStep(teleport)
			}),
		)

		/**
		 * Subscribe to transaction events.
		 **/
		this.unsubs.push(
			this.transactionManager.subscribe(
				TransactionEventTypes.TRANSACTION_UPDATED,
				async (transaction) => {
					this.logger.debug(
						`[${TransactionEventTypes.TRANSACTION_UPDATED}] ${transaction.status}`,
						transaction,
					)

					if (transaction.status === TransactionStatuses.Block) {
						this.logger.debug(`txHash ${transaction.txHash}`)
					}

					this.handleTransactionUpdate(transaction)
				},
			),
		)
	}

	// --------------------------
	// State Management
	// --------------------------

	private processNextStep(teleport: TeleportDetails): void {
		this.logger.debug(
			`Processing next step for teleport in status ${teleport.status}`,
			teleport,
		)

		this.statusActionMap[teleport.status]?.(teleport)
	}

	private calculateNextTeleportStatus(
		teleport: TeleportDetails,
		transaction: TransactionDetails,
	): TeleportStatus | null {
		if (this.transactionManager.isTransactionFailed(transaction)) {
			return TeleportStatuses.Failed
		}

		if (transaction.type === TransactionTypes.Teleport) {
			// Pending -> Transferring
			if (
				teleport.status === TeleportStatuses.Pending &&
				transaction.status !== TransactionStatuses.Unknown
			) {
				return TeleportStatuses.Transferring
			}

			// Transaction finalized: Transferring -> Waiting
			if (
				teleport.status === TeleportStatuses.Transferring &&
				transaction.status === TransactionStatuses.Finalized &&
				!this.transactionManager.isTransactionFailed(transaction)
			) {
				return TeleportStatuses.Waiting
			}
		}

		return null
	}

	private handleTransactionUpdate(transaction: TransactionDetails): void {
		const teleport = this.getTeleportById(transaction.teleportId)

		const nextStatus = this.calculateNextTeleportStatus(teleport, transaction)

		if (nextStatus) {
			this.updateStatus(teleport.id, nextStatus)
		} else {
			this.emitTeleportUpdated(teleport)
		}

		if (
			transaction.status === TransactionStatuses.Finalized &&
			!this.transactionManager.isTransactionFailed(transaction)
		) {
			const nextTransaction = this.findNextTransactionInSequence(
				teleport,
				transaction,
			)
			if (nextTransaction) {
				this.executeTeleportTransaction(nextTransaction)
			}
		}
	}

	private async checkForFunds(teleport: TeleportDetails) {
		const destination = teleport.details.route.destination

		await this.balanceService.waitForFundsIncrease({
			address: teleport.details.address,
			chain: destination,
			asset: teleport.details.asset,
			delta: teleport.details.receiveAmount,
		})

		this.updateStatus(teleport.id, TeleportStatuses.Completed, {
			checked: true,
		})
	}

	private startTeleport(teleport: TeleportDetails) {
		this.eventEmitter.emit({
			type: TeleportEventTypes.TELEPORT_STARTED,
			payload: this.teleportMapper(teleport),
		})
	}

	// --------------------------
	// Transaction Management
	// --------------------------

	private createTelportTransactions(
		params: TeleportParams,
		quote: Quote,
		teleportId: string,
	) {
		const source = quote.route.origin

		this.transactionManager.createTransaction({
			id: this.getTeleportTransactionId(teleportId),
			type: TransactionTypes.Teleport,
			order: 0,
			details: {
				amount: quote.total,
				from: quote.route.origin,
				to: quote.route.destination,
				address: params.address,
				asset: quote.asset,
			},
			teleportId,
			chain: source,
		})
	}

	private executeTeleportTransaction(transaction: TransactionDetails) {
		const teleport = this.getItem(transaction.teleportId)

		if (!teleport) {
			return
		}

		if (transaction.status !== TransactionStatuses.Unknown) {
			this.transactionManager.resetTransaction(transaction)
		}

		const actionExecutor: Record<
			TransactionType,
			({
				transaction,
				teleport,
			}: {
				transaction: TransactionDetails
				teleport: TeleportDetails
			}) => void
		> = {
			[TransactionTypes.Teleport]: ({ teleport }) => {
				this.transferFunds(teleport)
			},
		}

		actionExecutor[transaction.type]({ transaction, teleport })
	}

	private async transferFunds(teleport: TeleportDetails): Promise<void> {
		const transactionId = this.getTeleportTransactionId(teleport.id)

		const bridge = this.bridgeRegistry.get(teleport.details.route.protocol)

		const unsubscribe = await bridge.transfer(
			{
				amount: teleport.details.amount,
				from: teleport.details.route.origin,
				to: teleport.details.route.destination,
				address: teleport.details.address,
				asset: teleport.details.asset,
			},
			this.transactionCallbackHandler(transactionId),
		)

		this.transactionManager.updateItem(transactionId, { unsubscribe }, false)
	}

	private findNextPendingTransaction(
		teleport: TeleportDetails,
	): TransactionDetails | undefined {
		return this.transactionManager
			.getItemsWhere((tx) => tx.teleportId === teleport.id)
			.sort((a, b) => a.order - b.order)
			.find(
				(tx) =>
					tx.status === TransactionStatuses.Unknown ||
					this.transactionManager.isTransactionFailed(tx),
			)
	}

	private findNextTransactionInSequence(
		teleport: TeleportDetails,
		currentTransaction: TransactionDetails,
	): TransactionDetails | undefined {
		return this.transactionManager
			.getItemsWhere((tx) => tx.teleportId === teleport.id)
			.sort((a, b) => a.order - b.order)
			.find(
				(tx) =>
					tx.order > currentTransaction.order &&
					tx.status === TransactionStatuses.Unknown,
			)
	}

	private transactionCallbackHandler(
		transactionId: string,
	): TransactionCallback {
		return ({ status, txHash, error }) => {
			this.transactionManager.updateStatus(transactionId, status, {
				txHash,
				error,
				succeeded:
					status === TransactionStatuses.Finalized ? !error : undefined,
			})
		}
	}

	// --------------------------
	// Utility Methods
	// --------------------------

	private teleportMapper(teleport: TeleportDetails): TeleportEventPayload {
		return {
			...teleport,
			transactions: this.transactionManager.getTelportTransactions(teleport.id),
		}
	}

	private emitTeleportUpdated(teleport: TeleportDetails) {
		this.emitUpdate(this.teleportMapper(teleport))
	}

	/**
	 * Retrieves a teleport by id or throws.
	 * @param teleportId - Teleport identifier
	 * @returns Teleport details
	 * @throws Error if not found
	 */
	private getTeleportById(teleportId: string) {
		const teleport = this.getItem(teleportId)

		if (!teleport) {
			throw new Error(`Teleport with id ${teleportId} not found.`)
		}

		return teleport
	}

	/**
	 * Computes the transaction id associated with a teleport.
	 * @param teleportId - Teleport identifier
	 * @returns Transaction id string
	 */
	private getTeleportTransactionId(teleportId: string) {
		return `${teleportId}-transaction` as const
	}

	protected getUpdateEventType(): TeleportEventType {
		/**
		 * Event channel used when emitting teleport updates.
		 * @returns Teleport update event type
		 */
		return TeleportEventTypes.TELEPORT_UPDATED
	}

	protected getEmitUpdateEventPayload(
		item: TeleportDetails,
	): TeleportEventPayload {
		/**
		 * Maps internal teleport to emitted payload shape with transactions.
		 * @param item - Teleport details
		 * @returns Teleport event payload
		 */
		return this.teleportMapper(item)
	}

	/**
	 * Clears internal state and unsubscribes all listeners.
	 */
	destroy(): void {
		// Unsubscribe local listener subscriptions
		for (const u of this.unsubs) {
			try {
				u()
			} catch {
				// ignore
			}
		}
		this.unsubs.length = 0

		// Destroy downstream managers
		this.transactionManager.destroy()

		// Clear state and listeners
		this.items.clear()
		this.eventEmitter.removeAllListeners()
	}
}
