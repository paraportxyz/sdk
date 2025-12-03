export const Chains = {
	Polkadot: 'Polkadot',
	AssetHubKusama: 'AssetHubKusama',
	Kusama: 'Kusama',
	AssetHubPolkadot: 'AssetHubPolkadot',
	Hydration: 'Hydration',
	AssetHubPaseo: 'AssetHubPaseo',
	CoretimePaseo: 'CoretimePaseo',
	HydrationPaseo: 'HydrationPaseo',
} as const

// TODO: move to util
type ObjectValues<T> = T[keyof T]

export type Chain = ObjectValues<typeof Chains>

export const Assets = {
	DOT: 'DOT',
	KSM: 'KSM',
	HDX: 'HDX',
	PAS: 'PAS',
} as const

export type Asset = ObjectValues<typeof Assets>

export type Config<T = boolean> = Record<Chain, T>

export type ChainProperties = {
	ss58Format: number
	tokenDecimals: number
	tokenSymbol: string
	blockExplorer: string
	genesisHash?: string
}
