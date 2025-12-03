import { SUBSTRATE_ADDRESS } from '@/__tests__/utils/constants'
import { dummySigner } from '@/__tests__/utils/test-helpers'
import ParaPortSDK from '@/sdk/ParaPortSDK'
import BalanceService from '@/services/BalanceService'
import {
	AutoTeleportSessionEventTypes,
	TeleportSessionStatuses,
} from '@/types/sdk'
import { TransactionStatuses } from '@/types/transactions'
import { Assets, Chains } from '@paraport/static'
import { describe, expect, it, vi } from 'vitest'

// Single-threaded suite
describe.sequential('E2E: ParaPortSDK initSession → executeSession', () => {
	// Mock PolkadotApi to avoid ws/web provider usage in Node test env
	vi.mock('@/services/PolkadotApi', () => ({
		default: class PolkadotApiMock {
			getInstance = vi.fn().mockReturnValue({ client: {} })
			closeAll = vi.fn()
		},
	}))
	// Stub XCMBridge to supply a deterministic quote and transfer callback
	vi.mock('@/bridges/xcm/XCMBridge', () => ({
		default: class XCMBridgeStub {
			protocol = 'XCM' as const
			constructor(..._args: unknown[]) {}
			async initialize() {}
			async getQuote() {
				return {
					route: {
						origin: Chains.Kusama,
						destination: Chains.AssetHubKusama,
						protocol: 'XCM' as const,
					},
					fees: { bridge: 1n, total: 1n },
					amount: 99n,
					total: 100n,
					asset: Assets.KSM,
					execution: { requiredSignatureCount: 1, timeMs: 0 },
					teleportMode: 'Expected',
				}
			}
			async transfer(_params: any, cb: any) {
				cb({ status: TransactionStatuses.Broadcast } as any)
				cb({ status: TransactionStatuses.Finalized } as any)
				return () => {}
			}
		},
	}))

	it('emits Processing then Completed on executeSession', async () => {
		// Avoid any network interaction in BalanceService during this flow
		vi.spyOn(BalanceService.prototype, 'hasEnoughBalance').mockResolvedValue(
			false,
		)
		vi.spyOn(BalanceService.prototype, 'subscribeBalances').mockResolvedValue(
			() => {},
		)
    vi.spyOn(BalanceService.prototype, 'waitForFundsIncrease').mockResolvedValue({
        transferable: 1n,
    } as any)

		const sdk = new ParaPortSDK({
			chains: [Chains.Kusama, Chains.AssetHubKusama],
			bridgeProtocols: ['XCM'],
			getSigner: async () => dummySigner(),
		} as any)

		const statuses: string[] = []
		sdk.onSession(AutoTeleportSessionEventTypes.SESSION_UPDATED, (s) => {
			statuses.push(s.status)
		})

		await sdk.initialize()

		const session = await sdk.initSession({
			address: SUBSTRATE_ADDRESS,
			amount: '100',
			asset: Assets.KSM,
			chain: Chains.AssetHubKusama,
		})

		await sdk.executeSession(session.id)

		await Promise.resolve()
		await Promise.resolve()

		expect(statuses).toContain(TeleportSessionStatuses.Processing)
		expect(statuses).toContain(TeleportSessionStatuses.Completed)
	}, 30000)
})
