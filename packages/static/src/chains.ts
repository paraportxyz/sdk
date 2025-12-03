import { type Asset, Assets, type ChainProperties, type Config } from './types'
import { Chains } from './types'

export const toChainProperty = (
	ss58Format: number,
	tokenDecimals: number,
	tokenSymbol: Asset,
	blockExplorer: string,
): ChainProperties => {
	return {
		ss58Format,
		tokenDecimals,
		tokenSymbol,
		blockExplorer,
	}
}

export const CHAINS: Config<ChainProperties> = {
	[Chains.Polkadot]: toChainProperty(
		0,
		10,
		Assets.DOT,
		'https://polkadot.subscan.io/',
	),
	[Chains.AssetHubPolkadot]: toChainProperty(
		0,
		10,
		Assets.DOT,
		'https://assethub-polkadot.subscan.io/',
	),
	[Chains.Kusama]: toChainProperty(
		2,
		12,
		Assets.KSM,
		'https://kusama.subscan.io/',
	),
	[Chains.AssetHubKusama]: toChainProperty(
		2,
		12,
		Assets.KSM,
		'https://assethub-kusama.subscan.io/',
	),
	[Chains.Hydration]: toChainProperty(
		2,
		12,
		Assets.HDX,
		'https://hydradx.subscan.io',
	),
	[Chains.AssetHubPaseo]: toChainProperty(
		2,
		10,
		Assets.PAS,
		'https://assethub-paseo.subscan.io/',
	),
	[Chains.CoretimePaseo]: toChainProperty(
		2,
		10,
		Assets.PAS,
		'https://coretime-paseo.subscan.io/',
	),
	[Chains.HydrationPaseo]: toChainProperty(
		2,
		12,
		Assets.HDX,
		'https://hydradx-paseo.subscan.io/',
	),
}
