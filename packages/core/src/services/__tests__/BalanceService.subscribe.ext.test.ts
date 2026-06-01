import { describe, it, expect, vi, beforeEach } from 'vitest'
import BalanceService from '@/services/BalanceService'
import { SUBSTRATE_ADDRESS } from '@/__tests__/utils/constants'
import type PolkadotApi from '@/services/PolkadotApi'
import { Chains, Assets, type Chain } from '@paraport/static'
import { makeLoggerMock } from '@/__tests__/utils/test-helpers'

// Force asset to be treated as non-native with a location on AssetHub chains
vi.mock('@/utils/assets', () => ({
  getAssetInfo: vi.fn((_c: Chain, _a: any) => ({ isNative: false, location: { parents: 1, interior: { Here: null } } })),
  getAssetInfoOrThrow: vi.fn((_c: Chain, _a: any) => ({ isNative: false, location: { parents: 1, interior: { Here: null } } })),
}))

describe('BalanceService.subscribeBalances extended paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Hydration: polls CurrenciesApi on finalized blocks and triggers on increase', async () => {
    let free = 100n
    const unsub = vi.fn()
    let blockCb: (() => void) | undefined

    const papi = {
      getInstance: (chain: Chain) => {
        if (chain !== Chains.Hydration) throw new Error('unexpected chain')
        return {
          api: {
            apis: {
              CurrenciesApi: {
                free_balance: vi.fn(async () => free),
              },
            },
          },
          client: {
            finalizedBlock$: {
              subscribe: (cb: () => void) => {
                blockCb = cb
                return { unsubscribe: unsub }
              },
            },
          },
        }
      },
    } as unknown as PolkadotApi

    const svc = new BalanceService(papi, makeLoggerMock())
    const cb = vi.fn()
    const stop = await svc.subscribeBalances(
      { address: SUBSTRATE_ADDRESS, asset: Assets.KSM, chains: [Chains.Hydration] },
      cb,
    )

    // First block: no change
    blockCb && blockCb()
    await Promise.resolve()
    expect(cb).toHaveBeenCalledTimes(0)

    // Increase then block
    free = 150n
    blockCb && blockCb()
    await Promise.resolve()
    expect(cb).toHaveBeenCalledTimes(1)

    stop()
    expect(unsub).toHaveBeenCalledTimes(1)
  })

  it('AssetHub: subscribes via ForeignAssets or Assets and triggers on increase', async () => {
    const faUnsub = vi.fn()
    const assetsUnsub = vi.fn()
    let faCb: ((arg: any) => void) | undefined
    let assetsCb: ((arg: any) => void) | undefined

    const papi = {
      getInstance: (chain: Chain) => {
        if (chain !== Chains.AssetHubKusama) throw new Error('unexpected chain')
        return {
          api: {
            query: {
              ForeignAssets: {
                Account: {
                  getValue: vi.fn(async () => ({ balance: 100n })),
                  watchValue: vi.fn((_loc: any, _addr: string) => ({
                    subscribe: (cb: (arg: any) => void) => {
                      faCb = cb
                      return { unsubscribe: faUnsub }
                    },
                  })),
                },
              },
              Assets: {
                Account: {
                  getValue: vi.fn(async () => ({ balance: 100n })),
                  watchValue: vi.fn((_id: number, _addr: string) => ({
                    subscribe: (cb: (arg: any) => void) => {
                      assetsCb = cb
                      return { unsubscribe: assetsUnsub }
                    },
                  })),
                },
              },
              System: {
                Account: {
                  getValue: vi.fn(async (_a: string) => ({ data: { free: 100n } })),
                  watchValue: vi.fn((_a: string) => ({
                    subscribe: (_cb: any) => ({ unsubscribe: vi.fn() }),
                  })),
                },
              },
            },
          },
        }
      },
    } as unknown as PolkadotApi

    const svc = new BalanceService(papi, makeLoggerMock())
    const cb = vi.fn()
    const stop = await svc.subscribeBalances(
      { address: SUBSTRATE_ADDRESS, asset: Assets.KSM, chains: [Chains.AssetHubKusama] },
      cb,
    )

    // Simulate no change then increase on whichever pallet was used
    faCb?.({ value: { balance: 100n } })
    assetsCb?.({ value: { balance: 100n } })
    faCb?.({ value: { balance: 120n } })
    assetsCb?.({ value: { balance: 120n } })

    expect(cb).toHaveBeenCalledTimes(1)
    stop()
    // Exactly one of these should be used
    expect(faUnsub.mock.calls.length + assetsUnsub.mock.calls.length).toBe(1)
  })

  it('AssetHub fallback: uses System.Account when asset pallet watch is unavailable', async () => {
    const sysUnsub = vi.fn()
    let sysCb: ((arg: any) => void) | undefined

    const papi = {
      getInstance: (chain: Chain) => {
        if (chain !== Chains.AssetHubPolkadot) throw new Error('unexpected chain')
        return {
          api: {
            query: {
              // No ForeignAssets/Assets watchValue provided => forces fallback
              System: {
                Account: {
                  getValue: vi.fn(async (_a: string) => ({ data: { free: 100n } })),
                  watchValue: vi.fn((_a: string) => ({
                    subscribe: (cb: any) => {
                      sysCb = cb
                      return { unsubscribe: sysUnsub }
                    },
                  })),
                },
              },
            },
          },
        }
      },
    } as unknown as PolkadotApi

    const svc = new BalanceService(papi, makeLoggerMock())
    const cb = vi.fn()
    const stop = await svc.subscribeBalances(
      { address: SUBSTRATE_ADDRESS, asset: Assets.DOT, chains: [Chains.AssetHubPolkadot] },
      cb,
    )

    sysCb && sysCb({ value: { data: { free: 100n } } })
    sysCb && sysCb({ value: { data: { free: 150n } } })
    expect(cb).toHaveBeenCalledTimes(1)
    stop()
    expect(sysUnsub).toHaveBeenCalledTimes(1)
  })
})
// Keep address formatting simple in these unit tests
vi.mock('@/utils', () => ({
  formatAddress: vi.fn((a: string) => a),
}))
