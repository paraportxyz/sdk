import type { Logger } from '@/services/LoggerService'
import type PolkadotApi from '@/services/PolkadotApi'
import type { ApiMap } from '@/services/PolkadotApi'
import { formatAddress, transferableBalanceOf } from '@/utils'
import { getAssetInfoOrThrow } from '@/utils/assets'
import type { Asset, Chain } from '@paraport/static'
import {
	type TForeignAssetInfo,
	type TNativeAssetInfo,
	getAssetId,
	transform,
} from '@paraspell/sdk'
import pRetry from 'p-retry'

/**
 * Balance information for an account/asset on a chain.
 */
export type Balance = {
	chain: Chain
	address: string
	asset: Asset
	amount: bigint
	transferable: bigint
}

type GetBalancesParams = {
	address: string
	asset: Asset
	chains: Chain[]
}

type GetBalanceParams = { chain: Chain; address: string; asset: Asset }

/**
 * Provides balance fetching, subscription, and polling utilities.
 */
export default class BalanceService {
	constructor(
		private readonly api: PolkadotApi,
		private readonly logger: Logger,
	) {}

	/**
	 * Checks if an address has at least the specified amount transferable.
	 * @param params - Chain, address, asset and amount to check
	 * @returns True if transferable balance >= amount
	 */
	async hasEnoughBalance({
		chain,
		address,
		asset,
		amount,
	}: GetBalanceParams & { amount: bigint }) {
		const balance = await this.getBalance({ chain, address, asset })

		return balance.transferable >= BigInt(amount)
	}

	/**
	 * Fetches balance details on a single chain.
	 * @param params - Chain, address and asset
	 * @returns Balance object with total and transferable amounts
	 */
	private async getBalance({
		chain,
		address,
		asset,
	}: GetBalanceParams): Promise<Balance> {
		const { api } = this.api.getInstance(chain)
		const formattedAddress = formatAddress(address, chain)
		const assetInfo = getAssetInfoOrThrow(chain, asset)

		let amount = BigInt(0)

		if ((assetInfo as TNativeAssetInfo)?.isNative) {
			const { data } = await api.query.System.Account.getValue(formattedAddress)
			amount = data.free
		}
		// Foreign Assets
		else {
			const assetId = Number((assetInfo as TForeignAssetInfo)?.assetId)
			const location = (assetInfo as TForeignAssetInfo).location

			if (chain === 'Hydration' || chain === 'HydrationPaseo') {
				amount = await (
					api as ApiMap['Hydration'] | ApiMap['HydrationPaseo']
				).apis.CurrenciesApi.free_balance(assetId, formattedAddress)
			} else if (
				chain === 'AssetHubPolkadot' ||
				chain === 'AssetHubKusama' ||
				chain === 'AssetHubPaseo'
			) {
				const typedApi = api as
					| ApiMap['AssetHubPolkadot']
					| ApiMap['AssetHubKusama']
					| ApiMap['AssetHubPaseo']
				if (location) {
					const response = await typedApi.query.ForeignAssets.Account.getValue(
						transform(location),
						formattedAddress,
					)
					amount = BigInt(response?.balance || 0)
				} else if (assetId) {
					const response = await typedApi.query.Assets.Account.getValue(
						assetId,
						formattedAddress,
					)
					amount = BigInt(response?.balance || 0)
				}
			}
		}

		return {
			chain,
			asset,
			address: formattedAddress,
			amount,
			transferable: transferableBalanceOf(amount, chain, asset),
		} as Balance
	}

	/**
	 * Fetches balances for an address/asset across multiple chains.
	 * @param params - Address, asset and chain list
	 * @returns Array of balances
	 */
	async getBalances({
		address,
		asset,
		chains,
	}: GetBalancesParams): Promise<Balance[]> {
		try {
			const balancePromises = chains.map(async (chain) =>
				this.getBalance({ chain, address, asset }),
			)

			const balances = await Promise.all(balancePromises)

			return balances
		} catch (error: unknown) {
			throw new Error(`Failed to fetch balances: ${String(error)}`)
		}
	}

	/**
	 * Subscribes to balance increases for an address across chains.
	 * @param params - Address and chains to monitor (asset is unused for native fetch)
	 * @param callback - Invoked when a new higher free balance is seen
	 * @returns Unsubscribe function
	 */
	async subscribeBalances(
		{ address, asset, chains }: GetBalancesParams,
		callback: () => void,
	) {
		this.logger.debug('Subscribing to balance changes', {
			chains,
			asset,
			address,
		})

		const balancePromises = chains.map(async (chain) => {
			const { api, client } = this.api.getInstance(chain)
			const formattedAddress = formatAddress(address, chain)
			const assetInfo = getAssetInfoOrThrow(chain, asset)

			// Hydration uses multi-currency balances via runtime API (CurrenciesApi)
			if (chain === 'Hydration' || chain === 'HydrationPaseo') {
				const hydApi = api as ApiMap['Hydration'] | ApiMap['HydrationPaseo']
				const assetId = Number(getAssetId(chain, asset))

				let previousFree = await hydApi.apis.CurrenciesApi.free_balance(
					assetId,
					formattedAddress,
				)

				const sub = client.finalizedBlock$.subscribe(async () => {
					try {
						const free = await hydApi.apis.CurrenciesApi.free_balance(
							assetId,
							formattedAddress,
						)
						if (free > previousFree) {
							callback()
						}
						previousFree = free
					} catch (e) {
						this.logger.debug('Hydration balance polling error', e as Error)
					}
				})

				return { unsubscribe: () => sub.unsubscribe() }
			}

			// Non-Hydration chains
			// Decide source: native System.Account vs pallet assets (Assets/ForeignAssets).
			try {
				if ((assetInfo as TNativeAssetInfo)?.isNative) {
					// Native: subscribe to System.Account
					let {
						data: { free: previousFree },
					} = await api.query.System.Account.getValue(formattedAddress)

					return api.query.System.Account.watchValue(
						formattedAddress,
					).subscribe(({ data }) => {
						const { free } = data
						if (free > previousFree) {
							callback()
						}
						previousFree = free
					})
				}

				// Foreign assets (by location or assetId) — prefer pallet subscriptions when available.
				const foreignAsset = assetInfo as TForeignAssetInfo
				if (
					chain === 'AssetHubPolkadot' ||
					chain === 'AssetHubKusama' ||
					chain === 'AssetHubPaseo'
				) {
					const typedApi = api as
						| ApiMap['AssetHubPolkadot']
						| ApiMap['AssetHubKusama']
						| ApiMap['AssetHubPaseo']
					// Prefer ForeignAssets by location
					if (foreignAsset.location) {
						const initial = await typedApi.query.ForeignAssets.Account.getValue(
							transform(foreignAsset.location),
							formattedAddress,
						)
						let previousFree = BigInt(initial?.balance || 0)
						return typedApi.query.ForeignAssets.Account.watchValue(
							transform(foreignAsset.location),
							formattedAddress,
						).subscribe((data) => {
							const free = BigInt(data?.balance || 0)
							if (free > previousFree) {
								callback()
							}
							previousFree = free
						})
					}

					// Fallback to Assets by numeric assetId
					if (foreignAsset.assetId) {
						const id = Number(foreignAsset.assetId)
						const initial = await typedApi.query.Assets.Account.getValue(
							id,
							formattedAddress,
						)
						let previousFree = BigInt(initial?.balance || 0)
						return typedApi.query.Assets.Account.watchValue(
							id,
							formattedAddress,
						).subscribe((data) => {
							const free = BigInt(data?.balance || 0)
							if (free > previousFree) {
								callback()
							}
							previousFree = free
						})
					}
				}
			} catch (e) {
				this.logger.debug(
					'Asset subscription not available, falling back',
					e as Error,
				)
			}

			// Fallback: subscribe to native System.Account if specific pallet is not available
			let {
				data: { free: previousFree },
			} = await api.query.System.Account.getValue(formattedAddress)

			return api.query.System.Account.watchValue(formattedAddress).subscribe(
				({ data }) => {
					const { free } = data
					if (free > previousFree) {
						callback()
					}
					previousFree = free
				},
			)
		})

		const subscriptions = await Promise.all(balancePromises)

		return () => {
			for (const subscription of subscriptions) {
				subscription.unsubscribe()
			}
		}
	}

	/**
	 * Polls periodically until transferable balance reaches the target amount.
	 * @param params - Address, asset, chains and required amount
	 * @returns First balance that satisfies the threshold
	 */
	async waitForFunds({
		address,
		asset,
		chains,
		amount,
	}: {
		address: string
		asset: Asset
		chains: Chain[]
		amount: bigint
	}): Promise<Balance> {
		const getBalanceAttempt = async (): Promise<Balance> => {
			const balances = await this.getBalances({ address, asset, chains })
			if (balances.length > 0 && balances[0].transferable >= amount) {
				return balances[0]
			}
			throw new Error('Not enough balance yet.')
		}

		try {
			const balance = await pRetry(getBalanceAttempt, {
				retries: 100,
				minTimeout: 5000,
				maxTimeout: 10000,
			})
			return balance
		} catch (error) {
			this.logger.error('Error waiting for sufficient balance:', error)
			throw error
		}
	}

	/**
	 * Polls until the transferable balance increases by at least the specified delta.
	 * Captures the baseline on the first poll and computes a fixed target: baseline + delta.
	 *
	 * @param params - Address, asset, chain and required delta increase
	 * @returns First balance that satisfies the baseline + delta threshold
	 */
	async waitForFundsIncrease({
		address,
		asset,
		chain,
		delta,
	}: {
		address: string
		asset: Asset
		chain: Chain
		delta: bigint
	}): Promise<Balance> {
		let target: bigint | null = null

		const getBalanceAttempt = async (): Promise<Balance> => {
			const current = await this.getBalance({ address, asset, chain })

			if (target === null) {
				// Capture baseline on first successful read
				target = current.transferable + BigInt(delta)
			}

			if (current.transferable >= target) {
				return current
			}

			throw new Error('Increase threshold not met yet.')
		}

		try {
			const balance = await pRetry(getBalanceAttempt, {
				retries: 100,
				minTimeout: 5000,
				maxTimeout: 10000,
			})
			return balance
		} catch (error) {
			this.logger.error('Error waiting for balance increase:', error)
			throw error
		}
	}
}
