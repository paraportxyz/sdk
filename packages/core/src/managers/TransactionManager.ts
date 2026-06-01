import type { Chain } from '@paraport/static'
import { type BaseDetailsEvent, BaseManager } from '@/base/BaseManager'
import type { GenericEmitter } from '@/base/GenericEmitter'
import type { BridgeTransferParams } from '@/types/bridges'
import {
	type TransactionDetails,
	type TransactionEventType,
	TransactionEventTypes,
	type TransactionStatus,
	TransactionStatuses,
	type TransactionType,
} from '@/types/transactions'

/**
 * Manages bridge-related transactions for a single teleport.
 *
 * Creates, updates, and emits transaction state changes used by TeleportManager
 * to drive the teleport flow.
 */
export class TransactionManager extends BaseManager<
	TransactionDetails,
	TransactionStatus,
	BaseDetailsEvent,
	TransactionEventType,
	TransactionDetails // event payload
> {
	constructor(
		eventEmitter: GenericEmitter<TransactionDetails, TransactionEventType>,
	) {
		super(eventEmitter)
	}

	/**
	 * Creates and stores a new transaction with initial Unknown status.
	 *
	 * @param id - Unique transaction identifier
	 * @param chain - Chain the transaction is executed on
	 * @param teleportId - Parent teleport id
	 * @param type - Transaction type
	 * @param details - Bridge-specific transfer params
	 * @param order - Sequential order within teleport
	 * @returns Created transaction details
	 */
	createTransaction({
		chain,
		teleportId,
		type,
		details,
		order,
		id,
	}: {
		id: string
		chain: Chain
		teleportId: string
		type: TransactionType
		details: BridgeTransferParams
		order: number
	}): TransactionDetails {
		const transaction: TransactionDetails = {
			id,
			teleportId,
			status: TransactionStatuses.Unknown,
			chain: chain,
			details: details,
			events: [],
			timestamp: Date.now(),
			type,
			order,
		}

		this.setItem(id, transaction, false)

		return transaction
	}

	/**
	 * Event channel used when emitting transaction updates.
	 */
	protected getUpdateEventType(): TransactionEventType {
		return TransactionEventTypes.TRANSACTION_UPDATED
	}

	/**
	 * Gets transactions for a teleport, optionally filtered by type.
	 *
	 * @param teleportId - Parent teleport identifier
	 * @param options.type - Optional filter by transaction type
	 * @returns Array of matching transactions
	 */
	getTelportTransactions(
		teleportId: string,
		{ type }: { type?: TransactionType } = {},
	) {
		return this.getItemsWhere(
			(transaction) =>
				transaction.teleportId === teleportId &&
				(!type || transaction.type === type),
		)
	}

	/**
	 * Checks if a transaction failed (explicitly cancelled or has an error).
	 * @returns True if transaction is considered failed
	 */
	isTransactionFailed(transaction: TransactionDetails): boolean {
		return (
			transaction.status === TransactionStatuses.Cancelled ||
			Boolean(transaction.error)
		)
	}

	/**
	 * Resets a transaction to Unknown status and clears transient fields.
	 */
	resetTransaction(transaction: TransactionDetails): void {
		transaction.unsubscribe?.()

		this.updateStatus(transaction.id, TransactionStatuses.Unknown, {
			error: undefined,
			succeeded: undefined,
			txHash: undefined,
			unsubscribe: undefined,
		})
	}

	/**
	 * Unsubscribes active watchers, clears items and listeners.
	 */
	destroy(): void {
		// Unsubscribe any active watchers and clear items
		for (const tx of this.getAllItems()) {
			tx.unsubscribe?.()
		}
		this.items.clear()
		// Remove all event listeners on this manager's emitter
		this.eventEmitter.removeAllListeners()
	}
}
