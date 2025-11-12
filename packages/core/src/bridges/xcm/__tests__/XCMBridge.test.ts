import { beforeEach, describe, expect, it, vi } from 'vitest'
import XCMBridge from '@/bridges/xcm/XCMBridge'
import { SUBSTRATE_ADDRESS } from '@/__tests__/utils/constants'
import type BalanceService from '@/services/BalanceService'
import type { SDKConfig } from '@/types/common'
import { dummySigner, makePolkadotApiMock } from '@/__tests__/utils/test-helpers'
import { Assets, Chains } from '@paraport/static'
import { TeleportModes } from '@/types/teleport'

// Mock utils used in XCMBridge
vi.mock('@/utils', () => ({
  formatAddress: vi.fn((a: string) => a),
  getRouteChains: vi.fn((_dest: string, _asset: string) => [Chains.Kusama, Chains.AssetHubKusama]),
}))

// Mock paraspell Builder chain (factory hoisted) using shared helper via dynamic import
vi.mock('@paraspell/sdk', async (importOriginal) => {
  const actual: any = await importOriginal()
  const { makeParaspellBuilderModuleMock } = await import('@/__tests__/utils/test-helpers')
  const builder = makeParaspellBuilderModuleMock({ origin: 10n, destination: 5n })
  return {
    ...actual,
    ...builder,
    // Minimal assets catalog for assets.ts utilities
    getAssetsObject: vi.fn((_chain: string) => ({
      nativeAssets: [{ symbol: 'KSM' }, { symbol: 'DOT' }],
      otherAssets: [],
    })),
  }
})

// Mock signAndSend (factory hoisted)
vi.mock('@/utils/tx', () => ({
  signAndSend: vi.fn().mockResolvedValue(() => {}),
}))

const makePapi = () => makePolkadotApiMock()

describe('XCMBridge', () => {
  const config: SDKConfig = {
    chains: [Chains.Kusama, Chains.AssetHubKusama],
    bridgeProtocols: ['XCM'],
    getSigner: vi.fn().mockResolvedValue(dummySigner()),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getQuote computes totals and fees and returns expected structure', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 1_000_000n },
        { chain: Chains.AssetHubKusama, transferable: 100n },
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge(config, balanceService, makePapi())

    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: 1_000_000n,
      teleportMode: TeleportModes.Expected,
    })

    expect(quote).toBeTruthy()
    expect(quote?.fees.total).toBe(15n) // origin 10 + destination 5
    expect(quote?.route.origin).toBe(Chains.Kusama)
    expect(quote?.route.destination).toBe(Chains.AssetHubKusama)
    expect(quote?.asset).toBe(Assets.KSM)
    expect(quote?.execution.requiredSignatureCount).toBe(1)
  })

  it('transfer delegates to signAndSend and returns unsubscribe', async () => {
    const balanceService = {
      getBalances: vi.fn(),
    } as unknown as BalanceService

    const bridge = new XCMBridge(config, balanceService, makePapi())

    const unsub = await bridge.transfer({
      amount: 123n,
      from: Chains.Kusama,
      to: Chains.AssetHubKusama,
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
    }, vi.fn())

    expect(typeof unsub).toBe('function')
    expect(config.getSigner).toHaveBeenCalled()
  })

  it('calculates amounts for TeleportModes.Expected', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 1_000_000n },
        { chain: Chains.AssetHubKusama, transferable: 100n },
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge(config, balanceService, makePapi())

    const inputAmount = 1_000_000n
    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: inputAmount,
      teleportMode: TeleportModes.Expected,
    })

    // With fees = 15n, and current transferable = 100n
    // transferAmount = inputAmount - current + fee => 1_000_000 - 100 + 15 = 999_915n
    // receiving amount = transferAmount - fee = inputAmount - current = 999_900n
    expect(quote?.fees.total).toBe(15n)
    expect(quote?.total).toBe(999_915n)
    expect(quote?.amount).toBe(999_900n)
  })

  it('calculates amounts for TeleportModes.Exact', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 1_000_000n },
        { chain: Chains.AssetHubKusama, transferable: 100n },
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge(config, balanceService, makePapi())

    const inputAmount = 1_000_000n
    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: inputAmount,
      teleportMode: TeleportModes.Exact,
    })

    // transferAmount = inputAmount; receiving = inputAmount - fee = 1_000_000 - 15
    expect(quote?.fees.total).toBe(15n)
    expect(quote?.total).toBe(1_000_000n)
    expect(quote?.amount).toBe(999_985n)
  })

  it('calculates amounts for TeleportModes.Only', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 1_000_000n },
        { chain: Chains.AssetHubKusama, transferable: 100n },
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge(config, balanceService, makePapi())

    const inputAmount = 1_000_000n
    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: inputAmount,
      teleportMode: TeleportModes.Only,
    })

    // transferAmount = inputAmount - fee = 1_000_000 - 15
    // receiving = transferAmount - fee = inputAmount - 30
    expect(quote?.fees.total).toBe(15n)
    expect(quote?.total).toBe(999_985n)
    expect(quote?.amount).toBe(999_970n)
  })

  it('returns null when dryRun fails', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 1_000_000n },
        { chain: Chains.AssetHubKusama, transferable: 100n },
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge(config, balanceService, makePapi())

    // Make the next dryRun return a failure
    const paraspell = await import('@paraspell/sdk')
    // Call Builder() once to obtain the shared builderChain mock
    const builderChain = (paraspell as any).Builder()
    builderChain.dryRun.mockResolvedValueOnce({ failureReason: 'Simulation failed' })

    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: 1_000_000n,
      teleportMode: TeleportModes.Expected,
    })

    expect(quote).toBeNull()
  })

  it('returns null when origin transferable is insufficient for transferAmount', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 10n }, // origin too low
        { chain: Chains.AssetHubKusama, transferable: 0n }, // destination
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge(config, balanceService, makePapi())

    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: 1_000n,
      teleportMode: TeleportModes.Exact,
    })

    expect(quote).toBeNull()
  })

  it('falls back to next best origin when top candidate fee probe fails', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 2_000_000n }, // top candidate
        { chain: Chains.Polkadot, transferable: 1_500_000n }, // second best
        { chain: Chains.AssetHubKusama, transferable: 100n }, // destination
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge({
      ...config,
      chains: [Chains.Kusama, Chains.Polkadot, Chains.AssetHubKusama],
    }, balanceService, makePapi())

    const utils = await import('@/utils') as any
    // Provide two candidates + destination
    utils.getRouteChains.mockReturnValueOnce([
      Chains.Kusama,
      Chains.Polkadot,
      Chains.AssetHubKusama,
    ])

    const paraspell = await import('@paraspell/sdk')
    const builderChain = (paraspell as any).Builder()
    // First probe (for top candidate) fails, second succeeds
    builderChain.getXcmFee.mockRejectedValueOnce(new Error('probe failed'))

    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: 1_000_000n,
      teleportMode: TeleportModes.Expected,
    })

    expect(quote).toBeTruthy()
    expect(quote?.route.origin).toBe(Chains.Polkadot)
    expect(quote?.fees.total).toBe(15n)
  })

  it('returns null when no candidate origin passes fee probe', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 2_000_000n },
        { chain: Chains.Polkadot, transferable: 1_500_000n },
        { chain: Chains.AssetHubKusama, transferable: 100n },
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge({
      ...config,
      chains: [Chains.Kusama, Chains.Polkadot, Chains.AssetHubKusama],
    }, balanceService, makePapi())

    const utils = await import('@/utils') as any
    utils.getRouteChains.mockReturnValueOnce([
      Chains.Kusama,
      Chains.Polkadot,
      Chains.AssetHubKusama,
    ])

    const paraspell = await import('@paraspell/sdk')
    const builderChain = (paraspell as any).Builder()
    // All probes fail for two candidates
    builderChain.getXcmFee.mockRejectedValueOnce(new Error('probe failed'))
    builderChain.getXcmFee.mockRejectedValueOnce(new Error('probe failed'))

    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: 1_000_000n,
      teleportMode: TeleportModes.Expected,
    })

    expect(quote).toBeNull()
  })

  it('Exact mode does not enforce expected-destination check', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 1_000_000n },
        { chain: Chains.AssetHubKusama, transferable: 0n },
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge(config, balanceService, makePapi())

    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: 1_000n,
      teleportMode: TeleportModes.Exact,
    })

    expect(quote).toBeTruthy()
  })

  it('Only mode: returns null when receiving amount is non-positive', async () => {
    const balanceService = {
      getBalances: vi.fn().mockResolvedValue([
        { chain: Chains.Kusama, transferable: 1_000_000n },
        { chain: Chains.AssetHubKusama, transferable: 0n },
      ]),
    } as unknown as BalanceService

    const bridge = new XCMBridge(config, balanceService, makePapi())

    // With fees = 15, amount = 20 -> transfer = 5, receiving = -10 -> should be null
    const quote = await bridge.getQuote({
      address: SUBSTRATE_ADDRESS,
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
      amount: 20n,
      teleportMode: TeleportModes.Only,
    })

    expect(quote).toBeNull()
  })

  


})
