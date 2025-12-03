#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import {
	prodParasKusamaCommon,
	prodParasPolkadot,
	prodParasPolkadotCommon,
	prodRelayKusama,
	prodRelayPolkadot,
	testRelayPaseo,
} from '@polkadot/apps-config'

// Extract chain configurations
const ahp = prodParasPolkadotCommon.find(
	(key) => key.info === 'PolkadotAssetHub',
)
const ahk = prodParasKusamaCommon.find((key) => key.info === 'KusamaAssetHub')
const hyd = prodParasPolkadot.find((key) => key.info === 'hydradx')
const ahpas = testRelayPaseo.linked.find((key) => key.info === 'PaseoAssetHub')
const codpas = testRelayPaseo.linked.find((key) => key.info === 'PaseoCoretime')
const hydpas = testRelayPaseo.linked.find((key) => key.info === 'rococoHydraDX')

// Extract providers
const ahpProviders = Object.values(ahp?.providers || {})
const ahkProviders = Object.values(ahk?.providers || {})
const dotProviders = Object.values(prodRelayPolkadot?.providers || {})
const ksmProviders = Object.values(prodRelayKusama?.providers || {})
const hydProviders = Object.values(hyd?.providers || {})

// testing
const ahPasProviders = Object.values(ahpas?.providers || {})
const coPasProviders = Object.values(codpas?.providers || {})
const hydPasProviders = Object.values(hydpas?.providers || {})

// Filter out light client providers as they may not work in all environments
const filterProviders = (providers) =>
	providers.filter((provider) => !provider.startsWith('light://'))

// Generate TypeScript content
function generateProvidersTs() {
	const formatProviders = (providers, indent = '    ') => {
		return providers.map((provider) => `${indent}'${provider}',`).join('\n')
	}

	return `/**
 * Network providers configuration
 * Generated from @polkadot/apps-config endpoints
 *
 * This file is auto-generated. Do not edit manually.
 * Run 'node scripts/generate-providers.mjs' to regenerate.
 */

export const PROVIDERS = {
  // Polkadot Asset Hub (AHP)
  AssetHubPolkadot: [
${formatProviders(filterProviders(ahpProviders))}
  ] as const,

  // Kusama Asset Hub (AHK)
  AssetHubKusama: [
${formatProviders(filterProviders(ahkProviders))}
  ] as const,

  // Polkadot Relay Chain (DOT)
  Polkadot: [
${formatProviders(filterProviders(dotProviders))}
  ] as const,

  // Kusama Relay Chain (KSM)
  Kusama: [
${formatProviders(filterProviders(ksmProviders))}
  ] as const,

  // HydraDX Relay Chain (HYD)
  Hydration: [
${formatProviders(filterProviders(hydProviders))}
  ] as const,

  // Paseo Asset Hub (AHPAS)
  AssetHubPaseo: [
${formatProviders(filterProviders(ahPasProviders))}
  ] as const,

  // Paseo Hydration (HYDPAS)
  HydrationPaseo: [
${formatProviders(filterProviders(hydPasProviders))}
  ] as const,

  // Paseo Coretime (COPAS)
  CoretimePaseo: [
${formatProviders(filterProviders(coPasProviders))}
  ] as const
} as const

export type ProviderChain = keyof typeof PROVIDERS
export type ProvidersConfig = typeof PROVIDERS
`
}

// Write the generated file
const outputPath = './src/providers.ts'
const content = generateProvidersTs()

try {
	await writeFile(outputPath, content, 'utf8')
	console.log(
		'✅ Successfully generated providers configuration at:',
		outputPath,
	)
	console.log('📊 Provider counts:')
	console.log(
		`   - AHP (Polkadot Asset Hub): ${filterProviders(ahpProviders).length} providers`,
	)
	console.log(
		`   - AHK (Kusama Asset Hub): ${filterProviders(ahkProviders).length} providers`,
	)
	console.log(
		`   - DOT (Polkadot): ${filterProviders(dotProviders).length} providers`,
	)
	console.log(
		`   - KSM (Kusama): ${filterProviders(ksmProviders).length} providers`,
	)
	console.log(
		`   - HYD (HydraDX): ${filterProviders(hydProviders).length} providers`,
	)
	console.log(
		`   - AHPAS (Paseo Asset Hub): ${filterProviders(ahPasProviders).length} providers`,
	)
	console.log(
		`   - HYDPAS (Hydration Paseo): ${filterProviders(hydPasProviders).length} providers`,
	)
	console.log(
		`   - COPAS (Coretime Paseo): ${filterProviders(coPasProviders).length} providers`,
	)
} catch (error) {
	console.error('❌ Error generating providers configuration:', error)
	process.exit(1)
}
