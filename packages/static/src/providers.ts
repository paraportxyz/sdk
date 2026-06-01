/**
 * Network providers configuration
 * Generated from @polkadot/apps-config endpoints
 *
 * This file is auto-generated. Do not edit manually.
 * Run 'node scripts/generate-providers.mjs' to regenerate.
 */

export const PROVIDERS = {
	// Polkadot Asset Hub (AHP)
	AssetHubPolkadot: [
		'wss://asset-hub-polkadot-rpc.n.dwellir.com',
		'wss://statemint-rpc-tn.dwellir.com',
		'wss://asset-hub-polkadot.ibp.network',
		'wss://asset-hub-polkadot.dotters.network',
		'wss://rpc-asset-hub-polkadot.luckyfriday.io',
		'wss://statemint.api.onfinality.io/public-ws',
		'wss://polkadot-asset-hub-rpc.polkadot.io',
		'wss://statemint.public.curie.radiumblock.co/ws',
	] as const,

	// Kusama Asset Hub (AHK)
	AssetHubKusama: [
		'wss://asset-hub-kusama-rpc.n.dwellir.com',
		'wss://statemine-rpc-tn.dwellir.com',
		'wss://asset-hub-kusama.ibp.network',
		'wss://asset-hub-kusama.dotters.network',
		'wss://rpc-asset-hub-kusama.luckyfriday.io',
		'wss://assethub-kusama.api.onfinality.io/public-ws',
		'wss://kusama-asset-hub-rpc.polkadot.io',
		'wss://statemine.public.curie.radiumblock.co/ws',
	] as const,

	// Polkadot Relay Chain (DOT)
	Polkadot: [
		'wss://polkadot-rpc.publicnode.com',
		'wss://polkadot-rpc.n.dwellir.com',
		'wss://polkadot-rpc-tn.dwellir.com',
		'wss://rpc-polkadot.helixstreet.io',
		'wss://polkadot.ibp.network',
		'wss://polkadot.dotters.network',
		'wss://rpc-polkadot.luckyfriday.io',
		'wss://polkadot.api.onfinality.io/public-ws',
		'wss://polkadot.public.curie.radiumblock.co/ws',
		'wss://spectrum-03.simplystaking.xyz/cG9sa2Fkb3QtMDMtOTFkMmYwZGYtcG9sa2Fkb3Q/LjwBJpV3dIKyWQ/polkadot/mainnet/',
		'wss://rpc-polkadot.stakeworld.io',
		'wss://polkadot.rpc.subquery.network/public/ws',
	] as const,

	// Kusama Relay Chain (KSM)
	Kusama: [
		'wss://kusama-rpc.publicnode.com',
		'wss://kusama-rpc.n.dwellir.com',
		'wss://kusama-rpc-tn.dwellir.com',
		'wss://rpc-kusama.helixstreet.io',
		'wss://kusama.ibp.network',
		'wss://kusama.dotters.network',
		'wss://rpc-kusama.luckyfriday.io',
		'wss://kusama.api.onfinality.io/public-ws',
		'wss://kusama.public.curie.radiumblock.co/ws',
		'wss://spectrum-03.simplystaking.xyz/cG9sa2Fkb3QtMDMtOTFkMmYwZGYtcG9sa2Fkb3Q/QXq7QZ6Q60NDzA/kusama/mainnet/',
		'wss://rpc-kusama.stakeworld.io',
	] as const,

	// HydraDX Relay Chain (HYD)
	Hydration: [
		'wss://hydration-rpc.n.dwellir.com',
		'wss://rpc.hydradx.cloud',
		'wss://rpc.helikon.io/hydradx',
		'wss://hydration.ibp.network',
		'wss://hydration.dotters.network',
	] as const,

	// Paseo Asset Hub (AHPAS)
	AssetHubPaseo: [
		'wss://asset-hub-paseo-rpc.n.dwellir.com',
		'wss://asset-hub-paseo.ibp.network',
		'wss://asset-hub-paseo.dotters.network',
		'wss://sys.turboflakes.io/asset-hub-paseo',
	] as const,

	// Paseo Hydration (HYDPAS)
	HydrationPaseo: ['wss://paseo-rpc.play.hydration.cloud'] as const,

	// Paseo Coretime (COPAS)
	CoretimePaseo: [
		'wss://coretime-paseo.ibp.network',
		'wss://coretime-paseo.dotters.network',
	] as const,
} as const

export type ProviderChain = keyof typeof PROVIDERS
export type ProvidersConfig = typeof PROVIDERS
