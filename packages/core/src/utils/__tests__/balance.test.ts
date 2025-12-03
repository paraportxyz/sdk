import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Chain } from '@paraport/static'

// Mock only the asset ED accessor used by balance utils
vi.mock('@/utils/assets', () => ({
  getAssetExistentialDeposit: vi.fn((chain: Chain, asset: any) => {
    if (chain === 'AssetHubPolkadot' && asset === 'DOT') return 10n
    if (chain === 'Hydration' && asset === 'HDX') return undefined
    if (chain === 'Kusama' && asset === 'KSM') return 100n
    return undefined
  }),
}))

import { transferableBalanceOf } from '@/utils/balance'

describe('utils/balance.transferableBalanceOf', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subtracts existential deposit when present', () => {
    // ED(AssetHubPolkadot.DOT) = 10n (mocked)
    expect(transferableBalanceOf(100n, 'AssetHubPolkadot' as Chain, 'DOT' as any)).toBe(90n)
  })

  it('returns same amount when ED is undefined', () => {
    // ED(Hydration.HDX) = undefined (mocked)
    expect(transferableBalanceOf(200n, 'Hydration' as Chain, 'HDX' as any)).toBe(200n)
  })

  it('clamps to zero when ED > amount', () => {
    // ED(Kusama.KSM) = 100n (mocked) > 50n
    expect(transferableBalanceOf(50n, 'Kusama' as Chain, 'KSM' as any)).toBe(0n)
  })
})
