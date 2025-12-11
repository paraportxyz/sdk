import { GenericEmitter } from '@/base/GenericEmitter'
import { Initializable } from '@/base/Initializable'
import BridgeRegistry from '@/bridges/BridgeRegistry'
import XCMBridge from '@/bridges/xcm/XCMBridge'
import { SDKConfigManager } from '@/config/SDKConfigManager'
import InvalidSessionError from '@/errors/InvalidSessionError'
import InvalidTeleportParamsError from '@/errors/InvalidTeleportParamsError'
import SDKInitializationError from '@/errors/SDKInitializationError'
import SessionManager from '@/managers/SessionManager'
import { TeleportManager } from '@/managers/TeleportManager'
import BalanceService from '@/services/BalanceService'
import { Logger } from '@/services/LoggerService'
import PolkadotApi from '@/services/PolkadotApi'
import type { Quote, SDKConfig } from '@/types/common'
import {
	type AutoTeleportSessionCalculation,
	type AutoTeleportSessionEventType,
	type TeleportSession,
	type TeleportSessionPayload,
	TeleportSessionStatuses,
} from '@/types/sdk'
import {
	type TeleportEventPayload,
	type TeleportEventType,
	TeleportEventTypes,
	type TeleportMode,
	TeleportModes,
	type TeleportParams,
} from '@/types/teleport'
import { getRouteChains, isValidAddress } from '@/utils'
import { convertToBigInt } from '@/utils/number'
import { Assets, Chains } from '@paraport/static'

/**
 * Main entrypoint for interacting with ParaPort SDK.
 *
 * Provides session lifecycle management, quote calculation, teleport execution,
 * and event subscriptions for both sessions and teleports.
 */
export default class ParaPortSDK extends Initializable {
	private readonly teleportManager: TeleportManager
	private readonly config: SDKConfig
	private readonly bridgeRegistry = new BridgeRegistry()
	private readonly balanceService: BalanceService
	private readonly papi: PolkadotApi
	private readonly logger: Logger
	private readonly sessionManager: SessionManager
	private readonly unsubs: Array<() => void> = []

	constructor(config: SDKConfig<false>) {
		super()
		const combinedConfig = SDKConfigManager.getDefaultConfig(config)
		SDKConfigManager.validateConfig(combinedConfig)
		this.config = combinedConfig

		this.papi = new PolkadotApi(this.config)
		this.logger = new Logger({ minLevel: this.config.logLevel })
		this.balanceService = new BalanceService(this.papi, this.logger)
		this.sessionManager = new SessionManager(new GenericEmitter())

		this.teleportManager = new TeleportManager(
			new GenericEmitter<TeleportEventPayload, TeleportEventType>(),
			this.bridgeRegistry,
			this.papi,
			this.logger,
		)
	}

	/**
	 * Initializes the SDK and registered bridge adapters.
	 *
	 * @throws {SDKInitializationError} If initialization is attempted more than once
	 * or when any bridge fails to initialize.
	 * @returns Promise that resolves when the SDK is initialized
	 */
	async initialize() {
		if (this.isInitialized()) {
			throw new SDKInitializationError('SDK already initialized')
		}

		try {
			if (this.config.bridgeProtocols?.includes('XCM')) {
				this.bridgeRegistry.register(
					new XCMBridge(this.config, this.balanceService, this.papi),
				)
			}

			await Promise.all(
				this.bridgeRegistry.getAll().map((bridge) => bridge.initialize()),
			)

			this.registerListeners()

			this.markInitialized()

			this.logger.debug('SDK initialized successfully')
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new SDKInitializationError(
					`Failed to initialize SDK: ${error.message}`,
					{ cause: error },
				)
			}
			throw new SDKInitializationError(
				'Failed to initialize SDK: Unknown error',
			)
		}
	}

	/**
	 * Subscribes to session lifecycle events.
	 *
	 * @param event - Session event type to listen for
	 * @param callback - Handler invoked with the session payload
	 * @returns Unsubscribe function
	 */
	onSession(
		event: AutoTeleportSessionEventType,
		callback: (item: TeleportSessionPayload) => void,
	): () => void {
		return this.sessionManager.subscribe(event, callback)
	}

	/**
	 * Subscribes to teleport events emitted by the underlying TeleportManager.
	 *
	 * @param event - Teleport event type to listen for
	 * @param callback - Handler invoked with the teleport payload
	 * @returns Unsubscribe function
	 */
	onTeleport(
		event: TeleportEventType,
		callback: (item: TeleportEventPayload) => void,
	): () => void {
		return this.teleportManager.subscribe(event, callback)
	}

	/**
	 * Gets quotes from all registered bridges for the given teleport params.
	 *
	 * @param params - Teleport parameters
	 * @returns Resolved quotes (errors are swallowed per bridge)
	 */
	private async getQuotes(params: TeleportParams): Promise<Quote[]> {
		const bridges = this.bridgeRegistry.getAll()

		const quotePromises = bridges.map((bridge) =>
			bridge.getQuote(params).catch(() => null),
		)

		const results = await Promise.all(quotePromises)

		return results.filter((quote): quote is Quote => quote !== null)
	}

	/**
	 * Subscribes to balance changes for relevant chains and asset.
	 *
	 * @param params - Teleport parameters
	 * @param callback - Invoked on balance increase
	 * @returns Unsubscribe function
	 */
	private subscribeBalanceChanges(
		params: TeleportParams,
		callback: () => void,
	) {
		return this.balanceService.subscribeBalances(
			{
				address: params.address,
				asset: params.asset,
				chains: getRouteChains(params.chain, params.asset),
			},
			callback,
		)
	}

	/**
	 * Calculates whether a teleport is needed and gathers available quotes.
	 *
	 * @param params - Teleport parameters
	 * @returns Quote selection and funds availability
	 */
	private async calculateTeleport(
		params: TeleportParams,
	): Promise<AutoTeleportSessionCalculation> {
		const hasEnoughBalance = await this.balanceService.hasEnoughBalance(params)

		if (hasEnoughBalance) {
			return {
				quotes: {
					available: [],
					selected: undefined,
					bestQuote: undefined,
				},
				funds: {
					needed: false,
					available: false,
					noFundsAtAll: false,
				},
			}
		}

		const quotes = await this.getQuotes(params)

		const bestQuote = this.teleportManager.selectBestQuote(quotes)

		return {
			quotes: {
				available: quotes,
				selected: bestQuote,
				bestQuote: bestQuote,
			},
			funds: {
				needed: !hasEnoughBalance,
				available: quotes.length > 0,
				noFundsAtAll: !hasEnoughBalance && quotes.length === 0,
			},
		}
	}

	/**
	 * Calculates teleport quotes and subscribes to balance changes.
	 * Reusable helper for session initialization and param updates.
	 *
	 * @param params - Teleport parameters
	 * @param sessionId - Session ID or getter function (deferred for initSession)
	 * @returns Quotes, funds status, and unsubscribe function
	 */
	private async calculateAndSubscribe(
		params: TeleportParams,
		sessionId: string | (() => string),
	): Promise<{
		quotes: AutoTeleportSessionCalculation['quotes']
		funds: AutoTeleportSessionCalculation['funds']
		unsubscribe: () => void
	}> {
		const getSessionId =
			typeof sessionId === 'function' ? sessionId : () => sessionId

		const [{ quotes, funds }, unsubscribe] = await Promise.all([
			this.calculateTeleport(params),
			this.subscribeBalanceChanges(params, async () => {
				const newState = await this.calculateTeleport(params)
				this.sessionManager.updateSession(getSessionId(), {
					quotes: newState.quotes,
					funds: newState.funds,
				})
			}),
		])

		return { quotes, funds, unsubscribe }
	}

	/**
	 * Normalizes teleport parameters by applying default values.
	 * Ensures teleportMode defaults to TeleportModes.Expected if not provided.
	 *
	 * @param params - Raw teleport parameters
	 * @returns Normalized teleport parameters with defaults applied
	 */
	private normalizeParams(
		params: TeleportParams<string>,
	): TeleportParams<string> {
		return {
			...params,
			teleportMode: params.teleportMode || TeleportModes.Expected,
		}
	}

	/**
	 * Prepares teleport parameters by normalizing, validating, and converting to bigint.
	 * Ensures consistent parameter handling across session initialization and updates.
	 *
	 * @param params - Raw teleport parameters with string amount
	 * @returns Validated teleport parameters with bigint amount
	 * @throws {InvalidTeleportParamsError} If parameters fail validation
	 */
	private prepareTeleportParams(
		params: TeleportParams<string>,
	): TeleportParams {
		const normalized = this.normalizeParams(params)
		this.validateTeleportParams(normalized)
		return convertToBigInt(normalized, ['amount'])
	}

	/**
	 * Creates a new auto-teleport session for the provided parameters.
	 * Performs validation, resolves quotes, and watches balances.
	 *
	 * @param p - Raw teleport parameters with string amount
	 * @returns Created session
	 * @throws {InvalidTeleportParamsError} If parameters fail validation
	 */
	async initSession(p: TeleportParams<string>): Promise<TeleportSession> {
		this.ensureInitialized()
		const params = this.prepareTeleportParams(p)

		this.logger.debug('Starting to calculate teleport with params', params)

		// biome-ignore lint/style/useConst: sessionId is assigned after the getter closure is created
		let sessionId: string

		const { quotes, funds, unsubscribe } = await this.calculateAndSubscribe(
			params,
			() => sessionId,
		)

		this.logger.debug('Calculated teleport', { quotes, funds })

		sessionId = this.sessionManager.createSession(params, {
			status: TeleportSessionStatuses.Ready,
			quotes,
			funds,
			unsubscribe,
		})

		const session = this.sessionManager.getItem(sessionId)

		if (!session) {
			throw new Error('Session not found')
		}

		return session
	}

	/**
	 * Executes the teleport flow for an existing session.
	 * Creates the teleport, wires up transaction sequence, and starts processing.
	 *
	 * @param sessionId - ID of the session to execute
	 * @returns Teleport ID
	 * @throws {InvalidSessionError} If session state is invalid for execution
	 */
	public async executeSession(sessionId: string): Promise<string> {
		this.ensureInitialized()

		const session = this.sessionManager.getItem(sessionId)

		if (!session) {
			throw new InvalidSessionError('Session not found')
		}

		if (!session.quotes.selected) {
			throw new InvalidSessionError('No quote selected for the session')
		}

		if (!session.funds.needed) {
			throw new InvalidSessionError(
				'Session has sufficient funds, no teleport needed',
			)
		}

		session.unsubscribe()

		const teleport = await this.teleportManager.createTeleport(
			session.params,
			session.quotes.selected,
		)

		this.sessionManager.updateSession(sessionId, {
			teleportId: teleport.id,
		})

		this.teleportManager.initiateTeleport(
			teleport,
			session.params,
			session.quotes.selected,
		)

		return teleport.id
	}

	/**
	 * Updates teleport parameters for an existing session.
	 * Recalculates quotes and resubscribes to balance changes with new params.
	 *
	 * @param sessionId - ID of the session to update
	 * @param params - New teleport parameters
	 * @returns Updated session
	 * @throws {InvalidTeleportParamsError} If parameters fail validation
	 * @throws {InvalidSessionError} If session state is invalid for update
	 */
	public async updateSessionParams(
		sessionId: string,
		p: TeleportParams<string>,
	): Promise<TeleportSession> {
		this.ensureInitialized()
		const params = this.prepareTeleportParams(p)

		const session = this.sessionManager.getItem(sessionId)

		if (!session) {
			throw new InvalidSessionError('Session not found')
		}

		if (
			session.status === TeleportSessionStatuses.Completed ||
			session.status === TeleportSessionStatuses.Processing
		) {
			throw new InvalidSessionError('Session is completed or processing')
		}

		if (session.teleportId) {
			throw new InvalidSessionError(
				'Cannot update params after teleport started',
			)
		}

		if (session.status === TeleportSessionStatuses.Failed) {
			throw new InvalidSessionError('Cannot update params for a failed session')
		}

		session.unsubscribe()

		this.sessionManager.updateSession(sessionId, {
			status: TeleportSessionStatuses.Pending,
		})

		const { quotes, funds, unsubscribe } = await this.calculateAndSubscribe(
			params,
			sessionId,
		)

		this.sessionManager.updateSession(sessionId, {
			status: TeleportSessionStatuses.Ready,
			params,
			quotes,
			funds,
			unsubscribe,
		})

		const updatedSession = this.sessionManager.getItem(sessionId)

		if (!updatedSession) {
			throw new Error('Session not found after update')
		}

		return updatedSession
	}

	/**
	 * Retries a previously failed session's teleport.
	 *
	 * @param sessionId - Session containing a failed teleport
	 * @throws {InvalidSessionError} If session has no teleport ID
	 */
	public retrySession(sessionId: string): void {
		const session = this.sessionManager.getItem(sessionId)

		if (!session?.teleportId) {
			throw new InvalidSessionError(
				`Session ${sessionId} has no teleport ID. The session may not have been executed yet or the teleport creation failed.`,
			)
		}

		this.teleportManager.retryTeleport(session.teleportId)
	}

	/**
	 * Registers internal listeners to synchronize SessionManager with TeleportManager events.
	 */
	private registerListeners() {
		if (!this.teleportManager) return

		this.unsubs.push(
			this.teleportManager.subscribe(
				TeleportEventTypes.TELEPORT_STARTED,
				(payload) => {
					const session = this.sessionManager.getSessionByTeleportId(payload.id)

					if (!session) return

					this.sessionManager.updateSession(session.id, {
						status: TeleportSessionStatuses.Processing,
					})
				},
			),
		)

		this.unsubs.push(
			this.teleportManager.subscribe(
				TeleportEventTypes.TELEPORT_COMPLETED,
				(payload) => {
					const session = this.sessionManager.getSessionByTeleportId(payload.id)

					if (!session) return

					this.sessionManager.updateSession(session.id, {
						status: TeleportSessionStatuses.Completed,
					})
				},
			),
		)
	}

	/**
	 * Validates that the supplied teleport parameters are acceptable.
	 *
	 * @param params - Teleport parameters to be validated
	 * @throws {InvalidTeleportParamsError} When parameters are malformed or unsupported
	 */
	private validateTeleportParams(params: TeleportParams<string>) {
		const validAsset = Object.values(Assets).includes(params.asset)
		const validChain = Object.values(Chains).includes(params.chain)
		const validChainAsset = getRouteChains(params.chain, params.asset).includes(
			params.chain,
		)

		const validAmount = BigInt(params.amount) > BigInt(0)
		const validAddress = isValidAddress(params.address)
		const validMode = Object.values(TeleportModes).includes(
			params.teleportMode as TeleportMode,
		)

		const validationErrors = [
			!validAddress && 'Invalid address format',
			!validAsset && 'Invalid asset',
			!validAmount && 'Amount must be greater than 0',
			!validChain && 'Invalid chain',
			!validChainAsset && 'Asset not supported on the specified chain',
			!validMode && 'Invalid teleport mode',
		].filter(Boolean)

		if (validationErrors.length > 0) {
			throw new InvalidTeleportParamsError(
				`Invalid teleport parameters: ${validationErrors.join(', ')}`,
			)
		}
	}

	/**
	 * Tears down internal resources and subscriptions.
	 * Destroys managers and closes network clients.
	 */
	destroy(): void {
		// Unsubscribe local listeners registered by SDK
		for (const u of this.unsubs) {
			try {
				u()
			} catch {
				// ignore
			}
		}
		this.unsubs.length = 0

		// Destroy managers/state and close network clients
		this.sessionManager.destroy()
		this.teleportManager.destroy()
		this.papi.closeAll()
	}
}
