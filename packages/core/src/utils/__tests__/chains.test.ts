import { describe, expect, it, vi } from 'vitest'

vi.mock('@paraport/static', () => ({
  // Minimal chain props for tests
  CHAINS: {
    Polkadot: { ss58Format: 0, tokenDecimals: 10, blockExplorer: 'https://polkadot.subscan.io' },
  },
  CHAIN_NAMES: { Polkadot: 'Polkadot', AssetHubPolkadot: 'AssetHubPolkadot' },
  Chains: { Polkadot: 'Polkadot', AssetHubPolkadot: 'AssetHubPolkadot' },
}))

vi.mock('@paraspell/sdk', () => ({
  SUBSTRATE_CHAINS: ['Polkadot', 'AssetHubPolkadot', 'UnknownChain'],
}))

vi.mock('@paraspell/sdk-core', () => ({
  validateDestination: vi.fn((origin: string, destination: string) => {
    // Allow AssetHubPolkadot -> Polkadot route only
    if (origin === 'AssetHubPolkadot' && destination === 'Polkadot') return
    throw new Error('incompatible')
  }),
}))
vi.mock('@/utils/assets', () => ({
  isAssetSupported: (origin: string, _destination: string, asset: string) => {
    // Only AssetHubPolkadot supports DOT in this mock (origin-specific)
    return asset === 'DOT' && origin === 'AssetHubPolkadot'
  },
}))

import { chainPropListOf, getChainName, blockExplorerOf, getRouteChains } from '@/utils/chains'

describe('chains utils', () => {
  it('chainPropListOf and helpers', () => {
    const props = chainPropListOf('Polkadot')
    expect(props.ss58Format).toBe(0)
    expect(props.tokenDecimals).toBe(10)
    expect(getChainName('Polkadot')).toBe('Polkadot')
    expect(blockExplorerOf('Polkadot')).toContain('subscan')
  })

  it('getRouteChains returns origin plus supported destinations filtered to Chains', () => {
    const route = getRouteChains('Polkadot', 'DOT')
    expect(route).toEqual(['Polkadot', 'AssetHubPolkadot'])
  })

  it('getRouteChains calls validateDestination to decide allowed routes', async () => {
    const core = await import('@paraspell/sdk-core') as any
    const spy = core.validateDestination
    getRouteChains('Polkadot', 'DOT')
    expect(spy).toHaveBeenCalledWith('AssetHubPolkadot', 'Polkadot')
    expect(spy).toHaveBeenCalledWith('UnknownChain', 'Polkadot')
  })
})
