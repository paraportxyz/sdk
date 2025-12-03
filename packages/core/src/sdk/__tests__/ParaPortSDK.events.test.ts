import { beforeEach, describe, expect, it, vi } from 'vitest'
import ParaPortSDK from '@/sdk/ParaPortSDK'
import { Assets, Chains } from '@paraport/static'
import { SUBSTRATE_ADDRESS } from '@/__tests__/utils/constants'
import { AutoTeleportSessionEventTypes, TeleportSessionStatuses } from '@/types/sdk'
import BalanceService from '@/services/BalanceService'
import { dummySigner } from '@/__tests__/utils/test-helpers'
import { TransactionStatuses } from '@/types/transactions'

// Use a stub XCM bridge to avoid network/SDK dependencies and to emit tx statuses
vi.mock('@/bridges/xcm/XCMBridge', () => {
  return {
    default: class XCMBridgeStub {
      protocol = 'XCM' as const
      constructor(..._args: unknown[]) {}
      async initialize() {}
      async getQuote() {
        return {
          route: { origin: Chains.Kusama, destination: Chains.AssetHubKusama, protocol: 'XCM' as const },
          fees: { bridge: 1n, total: 1n },
          amount: 99n,
          total: 100n,
          asset: Assets.KSM,
          execution: { requiredSignatureCount: 1, timeMs: 0 },
          teleportMode: 'Expected',
        }
      }
      async transfer(_params: any, cb: any) {
        cb({ status: TransactionStatuses.Broadcast })
        cb({ status: TransactionStatuses.Finalized })
        return () => {}
      }
    },
  }
})

describe('ParaPortSDK event wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates session status: TELEPORT_STARTED -> Processing, TELEPORT_COMPLETED -> Completed', async () => {
    // Avoid network in BalanceService by stubbing all calls used in this flow
    vi.spyOn(BalanceService.prototype, 'hasEnoughBalance').mockResolvedValue(false)
    vi.spyOn(BalanceService.prototype, 'subscribeBalances').mockResolvedValue(() => {})
    vi.spyOn(BalanceService.prototype, 'waitForFundsIncrease').mockResolvedValue({ transferable: 1n } as any)

    const sdk = new ParaPortSDK({
      chains: [Chains.Kusama, Chains.AssetHubKusama],
      bridgeProtocols: ['XCM'],
      getSigner: async () => dummySigner(),
    } as any)

    const seen: Array<{ id: string; status: string }> = []
    sdk.onSession(AutoTeleportSessionEventTypes.SESSION_UPDATED, (s) => {
      seen.push({ id: s.id, status: s.status })
    })

    await sdk.initialize()

    const session = await sdk.initSession({
      address: SUBSTRATE_ADDRESS,
      amount: '100',
      asset: Assets.KSM,
      chain: Chains.AssetHubKusama,
    })

    await sdk.executeSession(session.id)

    // Allow event subscribers to run
    await Promise.resolve()
    await Promise.resolve()

    const statuses = seen.map((s) => s.status)
    expect(statuses).toContain(TeleportSessionStatuses.Processing)
    expect(statuses).toContain(TeleportSessionStatuses.Completed)
  })
})
