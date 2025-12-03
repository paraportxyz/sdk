import { SUBSTRATE_ADDRESS } from '@/__tests__/utils/constants'
import XCMBridge from '@/bridges/xcm/XCMBridge'
import { Assets, Chains } from '@paraport/static'
import { describe, expect, it, vi } from 'vitest'

// Make the suite single-threaded to avoid any accidental shared state
describe.sequential(
	'Integration: XCMBridge transfer (serialized tx snapshot)',
	() => {
		// Mock utils used by the bridge (no formatting side-effects, deterministic)
    vi.mock('@/utils', () => ({
        formatAddress: vi.fn((a: string) => a),
        getChainsOfAsset: vi.fn(() => [Chains.Kusama, Chains.AssetHubKusama]),
        getRouteChains: vi.fn((_dest: string, _asset: string) => [Chains.Kusama, Chains.AssetHubKusama]),
    }))

		// Use paraspell Builder mock with fixed fees and a serializable tx
		vi.mock('@paraspell/sdk', () => {
			const builderChain = {
				from: vi.fn().mockReturnThis(),
				to: vi.fn().mockReturnThis(),
				currency: vi.fn().mockReturnThis(),
				address: vi.fn().mockReturnThis(),
				senderAddress: vi.fn().mockReturnThis(),
				feeAsset: vi.fn().mockReturnThis(),
				dryRun: vi.fn().mockResolvedValue({}),
				getXcmFee: vi.fn().mockResolvedValue({
					origin: { fee: 10n },
					destination: { fee: 5n },
				}),
				build: vi.fn().mockResolvedValue({
					decodedCall: {
						module: 'PolkadotXcm',
						method: 'transfer_assets',
						parameters: {
							assets: '...omitted for brevity...',
							dest: '...omitted for brevity...',
						},
					},
					signSubmitAndWatch: vi.fn(),
				}),
			}
			return {
				Builder: vi.fn().mockReturnValue(builderChain),
				// Minimal assets catalog for utils/assets
				getAssetsObject: vi.fn((_chain: string) => ({
					nativeAssets: [{ symbol: 'KSM' }, { symbol: 'DOT' }],
					otherAssets: [],
				})),
			}
		})

		// Capture the transaction handed to signAndSend and return an unsubscribe fn
		vi.mock('@/utils/tx', () => ({
			signAndSend: vi.fn().mockImplementation(async ({ transaction }) => {
				// Return an unsubscribe function (no-op)
				return () => {}
			}),
		}))

		// Provide a minimal PolkadotApi mock; client is unused by our builder mock
		const papi = {
			getInstance: vi.fn().mockReturnValue({ client: {} }),
		} as any

		it('builds a serialized transfer tx that matches snapshot', async () => {
			const balanceService = {
				getBalances: vi.fn().mockResolvedValue([
					{ chain: Chains.Kusama, transferable: 1_000_000n },
					{ chain: Chains.AssetHubKusama, transferable: 200n },
				]),
			} as any

			const bridge = new XCMBridge(
				{
					chains: [Chains.Kusama, Chains.AssetHubKusama],
					getSigner: async () => ({}) as any,
					bridgeProtocols: ['XCM'],
				} as any,
				balanceService,
				papi,
			)

			const { signAndSend } = await import('@/utils/tx')

			await bridge.transfer(
				{
					amount: 123_456n,
					from: Chains.Kusama,
					to: Chains.AssetHubKusama,
					address: SUBSTRATE_ADDRESS,
					asset: Assets.KSM,
				},
				vi.fn(),
			)

			expect(signAndSend).toHaveBeenCalled()
			const callArg = (signAndSend as any).mock.calls.at(-1)?.[0]
			expect(callArg).toBeDefined()
			expect(callArg.transaction.decodedCall).toMatchSnapshot()
		}, 30000)
	},
)
