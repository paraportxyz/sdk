import { beforeEach, describe, expect, it, vi } from 'vitest'
import BalanceService from '@/services/BalanceService'
import { SUBSTRATE_ADDRESS } from '@/__tests__/utils/constants'
import { Chains, Assets, type Chain } from '@paraport/static'
import { makeLoggerMock, makePolkadotApiMock } from '@/__tests__/utils/test-helpers'

// Mock only the utils used by BalanceService
vi.mock('@/utils', () => ({
  formatAddress: vi.fn((a: string) => a),
  transferableBalanceOf: vi.fn((amount: bigint) => amount - 100n),
}))

// Speed up p-retry by executing synchronously (factory hoisted)
vi.mock('p-retry', () => ({
  default: async (fn: any, { retries }: any) => {
    let lastErr
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn()
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr
  },
}))

const makeApi = (
  freeByChain: Partial<Record<Chain, bigint>>,
  watchImpl?: (chain: Chain, cb: (arg: any) => void) => { unsubscribe: () => void }
) => makePolkadotApiMock(freeByChain, watchImpl)

describe('BalanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hasEnoughBalance true/false based on transferable', async () => {
    const api = makeApi({ [Chains.Kusama]: 1000n })
    const svc = new BalanceService(api, makeLoggerMock())

    const yes = await svc.hasEnoughBalance({ chain: Chains.Kusama, address: SUBSTRATE_ADDRESS, asset: Assets.KSM, amount: 800n })
    const no = await svc.hasEnoughBalance({ chain: Chains.Kusama, address: SUBSTRATE_ADDRESS, asset: Assets.KSM, amount: 950n })

    expect(yes).toBe(true) // 1000n - 100n >= 800n
    expect(no).toBe(false) // 1000n - 100n < 950n
  })

  it('getBalances maps chains and formats output', async () => {
    const api = makeApi({ [Chains.Kusama]: 2000n, [Chains.AssetHubKusama]: 500n })
    const svc = new BalanceService(api, makeLoggerMock())

    const balances = await svc.getBalances({ address: SUBSTRATE_ADDRESS, asset: Assets.KSM, chains: [Chains.Kusama, Chains.AssetHubKusama] })

    expect(balances).toHaveLength(2)
    // transferable = free - 100n (mocked)
    expect(balances.find(b => b.chain === Chains.Kusama)?.transferable).toBe(1900n)
    expect(balances.find(b => b.chain === Chains.AssetHubKusama)?.transferable).toBe(400n)
  })

  it('subscribeBalances invokes callback only on increase and unsubscribes', async () => {
    const unsub1 = vi.fn()
    const unsub2 = vi.fn()
    let callbacks: Record<Chain, (arg: any) => void> = {} as any
    const api = makeApi(
      { [Chains.Kusama]: 100n, [Chains.AssetHubKusama]: 100n },
      (chain: Chain, cb) => {
        callbacks[chain] = cb
        return { unsubscribe: chain === Chains.Kusama ? unsub1 : unsub2 }
      }
    )
    const svc = new BalanceService(api, makeLoggerMock())

    const cb = vi.fn()
    const unsub = await svc.subscribeBalances({ address: SUBSTRATE_ADDRESS, asset: Assets.KSM, chains: [Chains.Kusama, Chains.AssetHubKusama] }, cb)

    // No change
    callbacks[Chains.Kusama]!({ data: { free: 100n } })
    callbacks[Chains.AssetHubKusama]!({ data: { free: 100n } })
    // Increase on Kusama
    callbacks[Chains.Kusama]!({ data: { free: 150n } })
    // Decrease on AHK does not trigger
    callbacks[Chains.AssetHubKusama]!({ data: { free: 90n } })

    expect(cb).toHaveBeenCalledTimes(1)

    unsub()
    expect(unsub1).toHaveBeenCalledTimes(1)
    expect(unsub2).toHaveBeenCalledTimes(1)
  })

  it('waitForFunds retries until sufficient and returns balance', async () => {
    const api = makeApi({ [Chains.AssetHubKusama]: 100n })
    const svc = new BalanceService(api, makeLoggerMock())

    const getBalancesSpy = vi.spyOn(svc, 'getBalances')
      .mockResolvedValueOnce([{ chain: Chains.AssetHubKusama, transferable: 50n } as any])
      .mockResolvedValueOnce([{ chain: Chains.AssetHubKusama, transferable: 90n } as any])
      .mockResolvedValueOnce([{ chain: Chains.AssetHubKusama, transferable: 120n } as any])

    const result = await svc.waitForFunds({ address: SUBSTRATE_ADDRESS, asset: Assets.KSM, chains: [Chains.AssetHubKusama], amount: 100n })

    expect(result.transferable).toBe(120n)
    expect(getBalancesSpy).toHaveBeenCalledTimes(3)
  })

  it('waitForFundsIncrease retries until delta threshold and returns balance', async () => {
    const api = makeApi({ [Chains.AssetHubKusama]: 100n })
    const svc = new BalanceService(api, makeLoggerMock())

    const getBalanceSpy = vi.spyOn(svc as any, 'getBalance')
      .mockResolvedValueOnce({ chain: Chains.AssetHubKusama, transferable: 50n } as any)
      .mockResolvedValueOnce({ chain: Chains.AssetHubKusama, transferable: 75n } as any)
      .mockResolvedValueOnce({ chain: Chains.AssetHubKusama, transferable: 81n } as any)

    const result = await svc.waitForFundsIncrease({ address: SUBSTRATE_ADDRESS, asset: Assets.KSM, chain: Chains.AssetHubKusama, delta: 30n })

    // Baseline 50n + delta 30n => target 80n
    expect(result.transferable).toBe(81n)
    expect(getBalanceSpy).toHaveBeenCalledTimes(3)
  })
})
