import { beforeEach, describe, expect, it, vi } from 'vitest'
import ParaPortSDK from '@/sdk/ParaPortSDK'
import { Assets, Chains } from '@paraport/static'
import { SUBSTRATE_ADDRESS } from '@/__tests__/utils/constants'
import { TeleportSessionStatuses } from '@/types/sdk'
import BalanceService from '@/services/BalanceService'
import { dummySigner } from '@/__tests__/utils/test-helpers'
import { TeleportModes } from '@/types/teleport'

// Stub XCMBridge to avoid network
vi.mock('@/bridges/xcm/XCMBridge', () => ({
    default: class XCMBridgeStub {
        protocol = 'XCM' as const
        async initialize() { }
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
        async transfer() { return () => { } }
    },
}))

describe('ParaPortSDK.updateSessionParams', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('throws InvalidSessionError for non-existent session', async () => {
        vi.spyOn(BalanceService.prototype, 'hasEnoughBalance').mockResolvedValue(false)
        vi.spyOn(BalanceService.prototype, 'subscribeBalances').mockResolvedValue(() => { })

        const sdk = new ParaPortSDK({
            chains: [Chains.Kusama, Chains.AssetHubKusama],
            bridgeProtocols: ['XCM'],
            getSigner: async () => dummySigner(),
        } as any)

        await sdk.initialize()

        await expect(
            sdk.updateSessionParams('non-existent-id', {
                address: SUBSTRATE_ADDRESS,
                amount: '100',
                asset: Assets.KSM,
                chain: Chains.AssetHubKusama,
                teleportMode: TeleportModes.Expected,
            }),
        ).rejects.toThrow('Session not found')
    })

    it('throws for completed session', async () => {
        vi.spyOn(BalanceService.prototype, 'hasEnoughBalance').mockResolvedValue(false)
        vi.spyOn(BalanceService.prototype, 'subscribeBalances').mockResolvedValue(() => { })

        const sdk = new ParaPortSDK({
            chains: [Chains.Kusama, Chains.AssetHubKusama],
            bridgeProtocols: ['XCM'],
            getSigner: async () => dummySigner(),
        } as any)

        await sdk.initialize()

        const session = await sdk.initSession({
            address: SUBSTRATE_ADDRESS,
            amount: '100',
            asset: Assets.KSM,
            chain: Chains.AssetHubKusama,
        })

        // @ts-ignore - accessing private for testing
        sdk.sessionManager.updateSession(session.id, {
            status: TeleportSessionStatuses.Completed,
        })

        await expect(
            sdk.updateSessionParams(session.id, {
                address: SUBSTRATE_ADDRESS,
                amount: '200',
                asset: Assets.KSM,
                chain: Chains.AssetHubKusama,
                teleportMode: TeleportModes.Expected,
            }),
        ).rejects.toThrow('Session is completed or processing')
    })

    it('throws for session with active teleport', async () => {
        vi.spyOn(BalanceService.prototype, 'hasEnoughBalance').mockResolvedValue(false)
        vi.spyOn(BalanceService.prototype, 'subscribeBalances').mockResolvedValue(() => { })

        const sdk = new ParaPortSDK({
            chains: [Chains.Kusama, Chains.AssetHubKusama],
            bridgeProtocols: ['XCM'],
            getSigner: async () => dummySigner(),
        } as any)

        await sdk.initialize()

        const session = await sdk.initSession({
            address: SUBSTRATE_ADDRESS,
            amount: '100',
            asset: Assets.KSM,
            chain: Chains.AssetHubKusama,
        })

        // @ts-ignore - accessing private for testing
        sdk.sessionManager.updateSession(session.id, {
            teleportId: 'some-teleport-id',
        })

        await expect(
            sdk.updateSessionParams(session.id, {
                address: SUBSTRATE_ADDRESS,
                amount: '200',
                asset: Assets.KSM,
                chain: Chains.AssetHubKusama,
                teleportMode: TeleportModes.Expected,
            }),
        ).rejects.toThrow('Cannot update params after teleport started')
    })

    it('recalculates quotes when params are updated', async () => {
        vi.spyOn(BalanceService.prototype, 'hasEnoughBalance').mockResolvedValue(false)
        vi.spyOn(BalanceService.prototype, 'subscribeBalances').mockResolvedValue(() => { })

        const sdk = new ParaPortSDK({
            chains: [Chains.Kusama, Chains.AssetHubKusama],
            bridgeProtocols: ['XCM'],
            getSigner: async () => dummySigner(),
        } as any)

        await sdk.initialize()

        const session = await sdk.initSession({
            address: SUBSTRATE_ADDRESS,
            amount: '100',
            asset: Assets.KSM,
            chain: Chains.AssetHubKusama,
        })

        const updatedSession = await sdk.updateSessionParams(session.id, {
            address: SUBSTRATE_ADDRESS,
            amount: '200',
            asset: Assets.KSM,
            chain: Chains.AssetHubKusama,
            teleportMode: TeleportModes.Expected,
        })

        expect(updatedSession.params.amount).toBe(200n)
        expect(updatedSession.quotes.available.length).toBeGreaterThan(0)
    })

    it('applies default teleportMode when not provided via prepareTeleportParams', async () => {
        vi.spyOn(BalanceService.prototype, 'hasEnoughBalance').mockResolvedValue(false)
        vi.spyOn(BalanceService.prototype, 'subscribeBalances').mockResolvedValue(() => { })

        const sdk = new ParaPortSDK({
            chains: [Chains.Kusama, Chains.AssetHubKusama],
            bridgeProtocols: ['XCM'],
            getSigner: async () => dummySigner(),
        } as any)

        await sdk.initialize()

        const session = await sdk.initSession({
            address: SUBSTRATE_ADDRESS,
            amount: '100',
            asset: Assets.KSM,
            chain: Chains.AssetHubKusama,
        })

        // Update without providing teleportMode - should default to Expected
        const updatedSession = await sdk.updateSessionParams(session.id, {
            address: SUBSTRATE_ADDRESS,
            amount: '300',
            asset: Assets.KSM,
            chain: Chains.AssetHubKusama,
        } as any)

        expect(updatedSession.params.teleportMode).toBe(TeleportModes.Expected)
    })
})
