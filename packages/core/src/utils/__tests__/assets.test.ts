import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Chain } from '@paraport/static'

// Mock paraspell SDK assets catalog used by assets.ts
vi.mock('@paraspell/sdk', () => ({
  getAssetsObject: vi.fn((chain: Chain) => {
    if (chain === 'Hydration') {
      return {
        nativeAssets: [{ symbol: 'HDX', existentialDeposit: 123n, decimals: 12 }],
        otherAssets: [
          { symbol: 'DOT', assetId: 1, decimals: 10 },
          { symbol: 'USDT', location: { parents: 1, interior: 'Here' }, decimals: 6 },
        ],
      }
    }
    if (chain === 'AssetHubKusama') {
      return {
        nativeAssets: [{ symbol: 'KSM', decimals: 12 }],
        otherAssets: [{ symbol: 'DOT', alias: 'DOT2', decimals: 10 }],
      }
    }
    if (chain === 'AssetHubPolkadot') {
      return {
        nativeAssets: [{ symbol: 'DOT', existentialDeposit: 10n, decimals: 10 }],
        otherAssets: [{ symbol: 'USDT', assetId: 1984, decimals: 6 }],
      }
    }
    // Default
    return { nativeAssets: [], otherAssets: [] }
  }),
  getSupportedAssets: vi.fn(() => []),
  ForeignAbstract: vi.fn((alias: string) => `FA(${alias})`),
}))

import { getParaspellCurrencyInput, getAssetInfoOrThrow, getAssetExistentialDeposit, isAssetSupported, getAssetDecimals, isFeeAssetSupportedForRoute, __setAliasForTests, __resetAliasesForTests } from '@/utils/assets'

describe('utils/assets.getParaspellCurrencyInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetAliasesForTests()
  })

  it('returns { location } when asset has location (foreign by location)', () => {
    const input = getParaspellCurrencyInput('Hydration' as Chain, 'USDT' as any)
    expect(input).toEqual({ location: { parents: 1, interior: 'Here' } })
  })

  it('returns { id } when asset has numeric assetId (Assets pallet)', () => {
    const input = getParaspellCurrencyInput('Hydration' as Chain, 'DOT' as any)
    expect(input).toEqual({ id: 1 })
  })

  it('returns { symbol } for native asset without id/location', () => {
    const input = getParaspellCurrencyInput('Hydration' as Chain, 'HDX' as any)
    expect(input).toEqual({ symbol: 'HDX' })
  })

  it('returns { symbol: ForeignAbstract(alias) } when asset has alias', () => {
    __setAliasForTests('AssetHubKusama' as Chain, 'DOT' as any, 'DOT2')
    const input = getParaspellCurrencyInput('AssetHubKusama' as Chain, 'DOT' as any)
    expect(input).toEqual({ symbol: 'FA(DOT2)' })
  })

  it('throws when asset is not found on the chain', () => {
    expect(() => getParaspellCurrencyInput('AssetHubPolkadot' as Chain, 'ABC' as any)).toThrow()
  })
})

describe('utils/assets.getAssetInfoOrThrow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns asset info when asset exists on chain', () => {
    const info = getAssetInfoOrThrow('Hydration' as Chain, 'HDX' as any)
    expect(info).toMatchObject({ symbol: 'HDX' })
  })

  it('throws when asset is not found', () => {
    expect(() => getAssetInfoOrThrow('AssetHubPolkadot' as Chain, 'XYZ' as any)).toThrow()
  })
})

describe('utils/assets.getAssetExistentialDeposit and isAssetSupported', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetAliasesForTests()
  })

  it('getAssetExistentialDeposit returns the asset ED when present', () => {
    expect(getAssetExistentialDeposit('Hydration' as Chain, 'HDX' as any)).toBe(123n)
    expect(getAssetExistentialDeposit('AssetHubPolkadot' as Chain, 'DOT' as any)).toBe(10n)
  })

  it('isAssetSupported returns true when symbol is included by paraspell', async () => {
    const mod = await import('@paraspell/sdk') as any
    mod.getSupportedAssets.mockReturnValueOnce([{ symbol: 'DOT' }])
    expect(isAssetSupported('Polkadot' as Chain, 'AssetHubPolkadot' as Chain, 'DOT' as any)).toBe(true)
  })

  it('isAssetSupported returns false when symbol is not included', async () => {
    const mod = await import('@paraspell/sdk') as any
    mod.getSupportedAssets.mockReturnValueOnce([{ symbol: 'USDT' }])
    expect(isAssetSupported('Polkadot' as Chain, 'AssetHubPolkadot' as Chain, 'DOT' as any)).toBe(false)
  })

  it('isAssetSupported uses alias to disambiguate when the same symbol appears with multiple aliases (negative)', async () => {
    const mod = await import('@paraspell/sdk') as any
    // Supported list includes DOT, but with alias that does NOT match origin alias (expected DOT2)
    mod.getSupportedAssets.mockReturnValueOnce([{ symbol: 'DOT', alias: 'DOT1' }])
    __setAliasForTests('AssetHubKusama' as Chain, 'DOT' as any, 'DOT2')
    expect(isAssetSupported('AssetHubKusama' as Chain, 'AssetHubPolkadot' as Chain, 'DOT' as any)).toBe(false)
  })

  it('isAssetSupported uses alias to disambiguate when the same symbol appears with multiple aliases (positive)', async () => {
    const mod = await import('@paraspell/sdk') as any
    // Supported list includes DOT with alias matching origin (DOT2)
    mod.getSupportedAssets.mockReturnValueOnce([{ symbol: 'DOT', alias: 'DOT2' }])
    __setAliasForTests('AssetHubKusama' as Chain, 'DOT' as any, 'DOT2')
    expect(isAssetSupported('AssetHubKusama' as Chain, 'AssetHubPolkadot' as Chain, 'DOT' as any)).toBe(true)
  })
})

describe('utils/assets.getAssetDecimals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetAliasesForTests()
  })

  it('returns decimals for native assets when present', () => {
    expect(getAssetDecimals('Hydration' as Chain, 'HDX' as any)).toBe(12)
    expect(getAssetDecimals('AssetHubPolkadot' as Chain, 'DOT' as any)).toBe(10)
  })

  it('returns decimals for foreign assets by location/assetId when present', () => {
    expect(getAssetDecimals('Hydration' as Chain, 'USDT' as any)).toBe(6)
    expect(getAssetDecimals('Hydration' as Chain, 'DOT' as any)).toBe(10)
  })

  it('respects alias matching for chains with symbol aliases (e.g., DOT→DOT2)', () => {
    __setAliasForTests('AssetHubKusama' as Chain, 'DOT' as any, 'DOT2')
    expect(getAssetDecimals('AssetHubKusama' as Chain, 'DOT' as any)).toBe(10)
  })

  it('returns undefined when the asset is not present on chain', () => {
    expect(getAssetDecimals('Hydration' as Chain, 'XYZ' as any)).toBeUndefined()
  })
})

describe('utils/assets.isFeeAssetSupportedForRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns true when origin asset is marked as fee asset and destination is supported', async () => {
    const mod = await import('@paraspell/sdk') as any
    // Only the first call (origin) matters for this check
    mod.getAssetsObject.mockImplementationOnce((chain: Chain) => {
      if (chain === 'Hydration') {
        return {
          nativeAssets: [{ symbol: 'HDX', isFeeAsset: true }],
          otherAssets: [],
        }
      }
      return { nativeAssets: [], otherAssets: [] }
    })

    const ok = isFeeAssetSupportedForRoute({
      origin: 'Hydration' as Chain,
      destination: 'AssetHubPolkadot' as Chain,
      symbol: 'HDX' as any,
    })

    expect(ok).toBe(true)
  })

  it('returns false when destination is HydrationPaseo even if asset is fee asset', async () => {
    const mod = await import('@paraspell/sdk') as any
    mod.getAssetsObject.mockImplementationOnce((chain: Chain) => {
      if (chain === 'Hydration') {
        return { nativeAssets: [{ symbol: 'HDX', isFeeAsset: true }], otherAssets: [] }
      }
      return { nativeAssets: [], otherAssets: [] }
    })

    const ok = isFeeAssetSupportedForRoute({
      origin: 'Hydration' as Chain,
      destination: 'HydrationPaseo' as Chain,
      symbol: 'HDX' as any,
    })

    expect(ok).toBe(false)
  })

  it('returns false when asset is not a fee asset on origin', async () => {
    const mod = await import('@paraspell/sdk') as any
    mod.getAssetsObject.mockImplementationOnce((chain: Chain) => {
      if (chain === 'Hydration') {
        return { nativeAssets: [{ symbol: 'HDX' }], otherAssets: [] }
      }
      return { nativeAssets: [], otherAssets: [] }
    })

    const ok = isFeeAssetSupportedForRoute({
      origin: 'Hydration' as Chain,
      destination: 'AssetHubKusama' as Chain,
      symbol: 'HDX' as any,
    })

    expect(ok).toBe(false)
  })

  it('returns false when asset is not present on origin chain', async () => {
    const mod = await import('@paraspell/sdk') as any
    mod.getAssetsObject.mockImplementationOnce((_chain: Chain) => ({ nativeAssets: [], otherAssets: [] }))

    const ok = isFeeAssetSupportedForRoute({
      origin: 'Hydration' as Chain,
      destination: 'AssetHubKusama' as Chain,
      symbol: 'UNKNOWN' as any,
    })

    expect(ok).toBe(false)
  })
})
