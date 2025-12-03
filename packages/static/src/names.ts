import { type Chain, Chains } from './types'

export const CHAIN_NAMES: Record<Chain, string> = {
	[Chains.Polkadot]: 'Polkadot',
	[Chains.AssetHubPolkadot]: 'PolkadotHub',
	[Chains.Kusama]: 'Kusama',
	[Chains.AssetHubKusama]: 'KusamaHub',
	[Chains.Hydration]: 'Hydration',
	[Chains.CoretimePaseo]: 'Coretime Paseo',
	[Chains.AssetHubPaseo]: 'AssetHub Paseo',
	[Chains.HydrationPaseo]: 'Hydration Paseo',
}
