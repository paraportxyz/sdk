import {
	type Asset,
	CHAINS,
	CHAIN_NAMES,
	type Chain,
	type ChainProperties,
	Chains,
} from '@paraport/static'
import { SUBSTRATE_CHAINS } from '@paraspell/sdk'
import { validateDestination } from '@paraspell/sdk-core'
import { isAssetSupported } from './assets'

/**
 * Returns static chain properties (ss58, decimals, explorer, etc.).
 * @param chain - Chain identifier
 * @returns Chain properties
 */
export const chainPropListOf = (chain: Chain): ChainProperties => {
	return CHAINS[chain]
}

/**
 * Gets the SS58 address format for a chain.
 * @param chain - Chain identifier
 * @returns ss58 format number
 */
export const ss58Of = (chain: Chain): number => {
	return chainPropListOf(chain).ss58Format
}

/**
 * Gets token decimals for a chain.
 * @param chain - Chain identifier
 * @returns Number of decimals
 */
export const decimalsOf = (chain: Chain): number => {
	return chainPropListOf(chain).tokenDecimals
}

/**
 * Lists chains where teleport will interact and where a given asset is available.
 *
 * Returns the destination `chain` and all origin chains that support the asset.
 *
 * @param chain Destination chain.
 * @param asset Asset symbol.
 * @returns Array of chains including the destination and eligible origins.
 */
export const getRouteChains = (chain: Chain, asset: Asset): Chain[] => {
	const otherChains = SUBSTRATE_CHAINS.filter((origin) => {
		if (chain === origin) return false

		try {
			validateDestination(origin as Chain, chain)
		} catch (_error) {
			return false
		}

		return isAssetSupported(chain, origin as Chain, asset)
	})

	const allowed = new Set(Object.values(Chains))

	return [chain, ...otherChains].filter((c) =>
		allowed.has(c as Chain),
	) as Chain[]
}

/**
 * Gets a human-readable chain name.
 * @param chain - Chain identifier
 * @returns Chain name
 */
export const getChainName = (chain: Chain): string => {
	return CHAIN_NAMES[chain]
}

/**
 * Returns the block explorer URL for a chain.
 * @param chain - Chain identifier
 * @returns Explorer base URL
 */
export const blockExplorerOf = (chain: Chain): string => {
	return chainPropListOf(chain).blockExplorer
}
