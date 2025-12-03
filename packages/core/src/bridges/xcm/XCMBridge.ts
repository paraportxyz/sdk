import { Initializable } from '@/base/Initializable'
import type BalanceService from '@/services/BalanceService'
import type { Balance } from '@/services/BalanceService'
import type PolkadotApi from '@/services/PolkadotApi'
import type {
	BridgeAdapter,
	BridgeProtocol,
	BridgeTransferParams,
} from '@/types/bridges'
import type { Quote, SDKConfig } from '@/types/common'
import {
	type TeleportMode,
	TeleportModes,
	type TeleportParams,
} from '@/types/teleport'
import type { TransactionCallback } from '@/types/transactions'
import { formatAddress, getRouteChains } from '@/utils'
import {
	getParaspellCurrencyInput,
	isFeeAssetSupportedForRoute,
} from '@/utils/assets'
import { signAndSend } from '@/utils/tx'
import type { Asset, Chain } from '@paraport/static'
import { Builder } from '@paraspell/sdk'

type XCMTransferParams = {
	amount: bigint
	originChain: Chain
	destinationChain: Chain
	address: string
	asset: Asset
}

/**
 * XCM bridge adapter using Paraspell to construct and submit XCM transactions.
 */
export default class XCMBridge extends Initializable implements BridgeAdapter {
	protocol: BridgeProtocol = 'XCM'
	private readonly requiredSignatureCount: number = 1

	constructor(
		private readonly config: SDKConfig,
		private readonly balanceService: BalanceService,
		private readonly papi: PolkadotApi,
	) {
		super()
	}

	/**
	 * Builds a typed Paraspell query builder for XCM transfers.
	 * @param params - XCM transfer parameters
	 * @returns Paraspell builder instance
	 */
	private getParaspellQuery({
		amount,
		originChain,
		destinationChain,
		address,
		asset,
	}: XCMTransferParams) {
		const currencyInput = getParaspellCurrencyInput(originChain, asset)

		let builder = Builder({
			// Provide chain-specific clients to avoid paraspell from instantiating its own papi instances
			apiOverrides: {
				[originChain]: this.papi.getInstance(originChain).client,
				[destinationChain]: this.papi.getInstance(destinationChain).client,
			},
		})
			.from(originChain)
			.to(destinationChain)
			.currency({ ...currencyInput, amount })
			.address(formatAddress(address, destinationChain))
			.senderAddress(formatAddress(address, originChain))

		if (
			isFeeAssetSupportedForRoute({
				origin: originChain,
				destination: destinationChain,
				symbol: asset,
			})
		) {
			// Pay transaction fee with the same asset
			builder = builder.feeAsset(currencyInput)
		}

		return builder
	}

	/**
	 * Estimates the XCM fees for origin and destination.
	 * @param params - XCM transfer parameters
	 * @returns Sum of origin and destination fees as bigint
	 */
	private async getXcmFee({
		amount,
		originChain,
		destinationChain,
		address,
		asset,
	}: XCMTransferParams): Promise<bigint> {
		const query = this.getParaspellQuery({
			amount,
			originChain,
			destinationChain,
			address,
			asset,
		})

		try {
			const { origin, destination } = await query.getXcmFee()

			return BigInt(origin.fee || 0) + BigInt(destination.fee || 0)
		} catch (error) {
			console.log('Failed getting Xcm fee', error)
			throw error
		}
	}

	/**
	 * Selects the best origin chain from candidate balances by highest transferable
	 * that can actually support the route (validated via a sample getXcmFee call).
	 *
	 * - Sorts candidates by `transferable` desc
	 * - For each candidate, attempts a lightweight fee query to validate the route
	 * - Returns the first candidate that succeeds, otherwise null
	 */
	private async findOrigin({
		candidates,
		destinationChain,
		address,
		asset,
		amount,
	}: {
		candidates: Balance[]
		destinationChain: Chain
		address: string
		asset: Asset
		amount: bigint
	}): Promise<Balance | null> {
		const sorted = [...candidates].sort((a, b) =>
			b.transferable === a.transferable
				? 0
				: b.transferable > a.transferable
					? 1
					: -1,
		)

		for (const cand of sorted) {
			try {
				await this.getParaspellQuery({
					amount,
					originChain: cand.chain,
					destinationChain,
					address,
					asset,
				}).getXcmFee()

				return cand
			} catch {
				// Try next candidate
			}
		}

		return null
	}

	/**
	 * Computes transfer amount based on teleport mode and fees.
	 * @param amount - User requested amount
	 * @param xcmFee - Estimated XCM fee
	 * @param currentChainBalance - Balance on target chain
	 * @param teleportMode - Teleport mode
	 * @returns Calculated send amount
	 */
	private calculateTeleportAmount({
		amount,
		xcmFee,
		currentChainBalance,
		teleportMode,
	}: {
		amount: bigint
		teleportMode: TeleportMode
		currentChainBalance: Balance
		xcmFee: bigint
	}) {
		if (TeleportModes.Expected === teleportMode) {
			return amount - currentChainBalance.transferable + xcmFee
		}
		if (TeleportModes.Only === teleportMode) {
			return amount - xcmFee
		}
		return amount // TeleportModes.Exact
	}

	/**
	 * Produces a quote for teleporting funds via XCM given input params.
	 *
	 * @param params - Teleport parameters
	 * @returns Quote or null if not feasible
	 */
	async getQuote({
		address,
		asset,
		chain: destinationChain,
		amount,
		teleportMode = TeleportModes.Expected,
	}: TeleportParams): Promise<Quote | null> {
		// 1. get chains where the token is available
		const chains = getRouteChains(destinationChain, asset).filter((chain) =>
			this.config.chains.includes(chain),
		)

		// 2. get address balances on all chains where the token is available
		const balances = await this.balanceService.getBalances({
			address,
			chains,
			asset,
		})

		const currentChainBalance = balances.find(
			(balance) => balance.chain === destinationChain,
		)

		// 3. from possible target chains find the one with the highest transferable balance
		const targetChainBalances = balances.filter(
			(balance) => balance.chain !== destinationChain,
		)

		const highestBalanceChain = await this.findOrigin({
			candidates: targetChainBalances,
			destinationChain,
			address,
			asset,
			amount,
		})

		if (!highestBalanceChain || !currentChainBalance) {
			return null
		}

		const originChain = highestBalanceChain.chain

		// 4. calculate amount to teleport
		const simpleXcmFee = await this.getXcmFee({
			amount,
			originChain,
			destinationChain,
			address,
			asset,
		})

		const teleportAmountWithXcmFee = this.calculateTeleportAmount({
			amount,
			xcmFee: simpleXcmFee,
			currentChainBalance: currentChainBalance,
			teleportMode: TeleportModes.Expected,
		})

		const xcmFee = await this.getXcmFee({
			amount: teleportAmountWithXcmFee,
			originChain,
			destinationChain,
			address,
			asset,
		})

		const transferAmount = this.calculateTeleportAmount({
			amount,
			xcmFee,
			currentChainBalance,
			teleportMode,
		})

		const query = this.getParaspellQuery({
			amount: transferAmount,
			originChain,
			destinationChain,
			address,
			asset,
		})

		const dryRun = await query.dryRun()

		const totalFees = xcmFee
		const receivingAmount = transferAmount - totalFees

		if (
			transferAmount <= 0n || // valid transfer amount
			receivingAmount <= 0n || // ensures positive receive
			Boolean(dryRun.failureReason) || // fails to execute
			highestBalanceChain.transferable < transferAmount || // can transfer
			(teleportMode === TeleportModes.Expected &&
				currentChainBalance.transferable + receivingAmount < amount) // ends up with desired amount
		) {
			return null
		}

		return {
			teleportMode,
			amount: receivingAmount,
			total: transferAmount,
			asset: asset,
			route: {
				origin: originChain,
				destination: destinationChain,
				protocol: this.protocol,
			},
			fees: {
				bridge: xcmFee,
				total: totalFees,
			},
			execution: {
				requiredSignatureCount: this.requiredSignatureCount,
				timeMs: 30000,
			},
		}
	}

	/**
	 * Executes an XCM transfer and wires events to a transaction callback.
	 *
	 * @param params - Transfer parameters
	 * @param callback - Receives transaction lifecycle updates
	 * @returns Unsubscribe function for the underlying transaction observer
	 */
	async transfer(
		{
			amount,
			from: originChain,
			to: destinationChain,
			address,
			asset,
		}: BridgeTransferParams,
		callback: TransactionCallback,
	) {
		const query = this.getParaspellQuery({
			amount,
			originChain,
			destinationChain,
			address,
			asset,
		})

		const transaction = await query.build()

		return signAndSend({
			transaction,
			callback,
			signer: await this.config.getSigner(),
		})
	}

	/**
	 * Initializes the adapter. Pre-warming of APIs could be added here.
	 * @returns Promise resolving when ready
	 */
	async initialize(): Promise<void> {
		return Promise.resolve()
	}
}
