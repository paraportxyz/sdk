import { ahk, ahp, ahpas, copas, dot, hyd, hydpas, ksm } from '@/descriptors'
import type { SDKConfig } from '@/types/common'
import type { Chain } from '@paraport/static'
import { Chains, PROVIDERS } from '@paraport/static'
import type { PolkadotClient, TypedApi } from 'polkadot-api'
import { createClient } from 'polkadot-api'
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat'
import { getWsProvider } from 'polkadot-api/ws-provider/web'

const config = {
	[Chains.AssetHubPolkadot]: {
		descriptor: ahp,
		providers: PROVIDERS.AssetHubPolkadot,
	},
	[Chains.AssetHubKusama]: {
		descriptor: ahk,
		providers: PROVIDERS.AssetHubKusama,
	},
	[Chains.Polkadot]: {
		descriptor: dot,
		providers: PROVIDERS.Polkadot,
	},
	[Chains.Kusama]: {
		descriptor: ksm,
		providers: PROVIDERS.Kusama,
	},
	[Chains.Hydration]: {
		descriptor: hyd,
		providers: PROVIDERS.Hydration,
	},
	[Chains.AssetHubPaseo]: {
		descriptor: ahpas,
		providers: PROVIDERS.AssetHubPaseo,
	},
	[Chains.CoretimePaseo]: {
		descriptor: copas,
		providers: PROVIDERS.CoretimePaseo,
	},
	[Chains.HydrationPaseo]: {
		descriptor: hydpas,
		providers: PROVIDERS.HydrationPaseo,
	},
}

export type SupportedChain = keyof typeof config

export type ApiMap = {
	[K in SupportedChain]: TypedApi<(typeof config)[K]['descriptor']>
}

/**
 * Lightweight Polkadot API client manager that creates and caches
 * chain-specific clients and typed APIs with configured endpoints.
 */
export default class PolkadotApi {
	private clients = new Map<SupportedChain, PolkadotClient>()

	constructor(private readonly config: SDKConfig) {}

	/**
	 * Retrieves a typed API client for a chain, creating it on-demand.
	 *
	 * @param chain - Chain identifier
	 * @returns Object with typed api and raw client
	 */
	getInstance = (chain: Chain) => {
		if (!this.clients.has(chain)) {
			const configEndpoints = this.config.endpoints?.[chain]

			const endpoints = configEndpoints || [...config[chain].providers]

			const client = createClient(
				withPolkadotSdkCompat(getWsProvider({ endpoints })),
			)

			this.clients.set(chain, client)
		}

		const client = this.clients.get(chain)

		if (!client) {
			throw new Error(`Client not found for chain ${chain}`)
		}

		return {
			api: client.getTypedApi(config[chain].descriptor),
			client,
		}
	}

	/**
	 * Destroys all cached clients and clears the registry.
	 */
	closeAll(): void {
		for (const client of this.clients.values()) {
			try {
				client.destroy()
			} catch {
				console.error('Error closing client')
			}
		}

		this.clients.clear()
	}
}
