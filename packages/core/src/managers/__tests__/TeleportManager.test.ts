import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeleportManager } from '@/managers/TeleportManager'
import { SUBSTRATE_ADDRESS } from '@/__tests__/utils/constants'
import { GenericEmitter } from '@/base/GenericEmitter'
import type BridgeRegistry from '@/bridges/BridgeRegistry'
import type PolkadotApi from '@/services/PolkadotApi'
import type { Logger } from '@/services/LoggerService'
import { TransactionStatuses } from '@/types/transactions'
import { TeleportEventTypes, TeleportStatuses } from '@/types/teleport'
import { Assets, Chains } from '@paraport/static'
import BalanceService from '@/services/BalanceService'

const makeLogger = (): Logger => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any)
const makePapi = () => ({}) as unknown as PolkadotApi

describe('TeleportManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('happy path: create → initiate → finalized → waitForFunds → completed', async () => {
    // Bridge that immediately finalizes the teleport tx
    const bridge = {
      protocol: 'XCM',
      transfer: vi.fn().mockImplementation((_params, cb) => {
        cb({ status: TransactionStatuses.Broadcast } as any)
        cb({ status: TransactionStatuses.Finalized } as any)
        return Promise.resolve(() => {})
      }),
    }
    const registry = { get: vi.fn().mockReturnValue(bridge) } as unknown as BridgeRegistry

    // Make waitForFundsIncrease resolve immediately
    vi.spyOn(BalanceService.prototype, 'waitForFundsIncrease').mockResolvedValue({ transferable: 1n } as any)

    const tm = new TeleportManager(
      new GenericEmitter(),
      registry,
      makePapi(),
      makeLogger(),
    )

    const updates: any[] = []
    const completed = vi.fn()
    tm.subscribe(TeleportEventTypes.TELEPORT_UPDATED, (p) => updates.push(p.status))
    tm.subscribe(TeleportEventTypes.TELEPORT_COMPLETED, completed)

    const params = { address: SUBSTRATE_ADDRESS, amount: 100n, asset: Assets.KSM, chain: Chains.AssetHubKusama }
    const quote = {
      teleportMode: 'Expected',
      total: 100n, amount: 80n, asset: Assets.KSM,
      route: { origin: Chains.Kusama, destination: Chains.AssetHubKusama, protocol: 'XCM' },
      fees: { bridge: 10n, total: 10n },
      execution: { requiredSignatureCount: 1, timeMs: 30_000 },
    }

    const tp = await tm.createTeleport(params as any, quote as any)
    tm.initiateTeleport(tp, params as any, quote as any)

    // Allow microtasks to flush
    await Promise.resolve()
    await Promise.resolve()

    expect(updates).toContain(TeleportStatuses.Transferring)
    expect(updates).toContain(TeleportStatuses.Waiting)
    expect(updates).toContain(TeleportStatuses.Completed)
    expect(completed).toHaveBeenCalled()
  })

  it('retry path: failed → retry → proceeds', async () => {
    let call = 0
    const bridge = {
      protocol: 'XCM',
      transfer: vi.fn().mockImplementation((_params, cb) => {
        call++
        if (call === 1) {
          cb({ status: TransactionStatuses.Finalized, error: 'Module' } as any)
        } else {
          cb({ status: TransactionStatuses.Broadcast } as any)
          cb({ status: TransactionStatuses.Finalized } as any)
        }
        return Promise.resolve(() => {})
      }),
    }
    const registry = { get: vi.fn().mockReturnValue(bridge) } as unknown as BridgeRegistry

    vi.spyOn(BalanceService.prototype, 'waitForFundsIncrease').mockResolvedValue({ transferable: 1n } as any)

    const tm = new TeleportManager(new GenericEmitter(), registry, makePapi(), makeLogger())

    const statuses: any[] = []
    tm.subscribe(TeleportEventTypes.TELEPORT_UPDATED, (p) => statuses.push(p.status))

    const params = { address: SUBSTRATE_ADDRESS, amount: 100n, asset: Assets.KSM, chain: Chains.AssetHubKusama }
    const quote = {
      teleportMode: 'Expected',
      total: 100n, amount: 80n, asset: Assets.KSM,
      route: { origin: Chains.Kusama, destination: Chains.AssetHubKusama, protocol: 'XCM' },
      fees: { bridge: 10n, total: 10n },
      execution: { requiredSignatureCount: 1, timeMs: 30_000 },
    }

    const tp = await tm.createTeleport(params as any, quote as any)
    tm.initiateTeleport(tp, params as any, quote as any)

    await Promise.resolve()

    // Should have failed status registered
    expect(statuses).toContain(TeleportStatuses.Failed)

    tm.retryTeleport(tp.id)

    await Promise.resolve()
    await Promise.resolve()

    // After retry, it should progress to Completed
    expect(statuses).toContain(TeleportStatuses.Completed)
  })
})
