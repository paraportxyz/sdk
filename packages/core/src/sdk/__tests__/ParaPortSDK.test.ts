import { SUBSTRATE_ADDRESS } from '@/__tests__/utils/constants'
import type { SDKConfig } from '@/types/common'
import { TeleportModes, type TeleportParams } from '@/types/teleport'
import { Assets, Chains } from '@paraport/static'
import { beforeEach, describe, expect, it } from 'vitest'
import ParaPortSDK from '../ParaPortSDK'

describe('ParaPortSDK', () => {
	let sdk: ParaPortSDK
	const mockConfig: SDKConfig<false> = {
		chains: [Chains.Kusama, Chains.AssetHubKusama],
		bridgeProtocols: ['XCM'],
		getSigner: async () => {
			return null as any
		}
	}

	beforeEach(() => {
		sdk = new ParaPortSDK(mockConfig)
	})

	describe('initialization', () => {
		it('should initialize successfully with valid config', async () => {
			await expect(sdk.initialize()).resolves.not.toThrow()
		}, 20000)

		it('should throw error when initializing twice', async () => {
			await sdk.initialize()
			await expect(sdk.initialize()).rejects.toThrow('SDK already initialized')
		}, 20000)
	})

	describe('validateTeleportParams', () => {
		const validParams: TeleportParams<string> = {
			address: SUBSTRATE_ADDRESS,
			amount: '1000000000000',
			asset: Assets.KSM,
			chain: Chains.AssetHubKusama,
			teleportMode: TeleportModes.Expected
		}

		it('should not throw for valid params', () => {
			expect(() => {
				// @ts-ignore - accessing private method for testing
				sdk.validateTeleportParams(validParams)
			}).not.toThrow()
		})

		it('should throw for invalid address', () => {
			const invalidParams = { ...validParams, address: 'invalid-address' }
			expect(() => {
				// @ts-ignore - accessing private method for testing
				sdk.validateTeleportParams(invalidParams)
			}).toThrow('Invalid address format')
		})

		it('should throw for invalid amount', () => {
			const invalidParams = { ...validParams, amount: '0' }
			expect(() => {
				// @ts-ignore - accessing private method for testing
				sdk.validateTeleportParams(invalidParams)
			}).toThrow('Amount must be greater than 0')
		})

		it('should throw for invalid asset', () => {
			const invalidParams = { ...validParams, asset: 'INVALID' as any }
			expect(() => {
				// @ts-ignore - accessing private method for testing
				sdk.validateTeleportParams(invalidParams)
			}).toThrow('Invalid asset')
		})

		it('should throw for invalid teleportMode', () => {
			const invalidParams = { ...validParams, teleportMode: 'INVALID' as any }
			expect(() => {
				// @ts-ignore - accessing private method for testing
				sdk.validateTeleportParams(invalidParams)
			}).toThrow('Invalid teleport mode')
		})
	})

	describe('initSession with prepareTeleportParams', () => {
		it('applies default teleportMode when not provided', async () => {
			const { vi } = await import('vitest')
			const BalanceService = (await import('@/services/BalanceService')).default

			vi.spyOn(BalanceService.prototype, 'hasEnoughBalance').mockResolvedValue(true)
			vi.spyOn(BalanceService.prototype, 'subscribeBalances').mockResolvedValue(() => { })

			await sdk.initialize()

			const session = await sdk.initSession({
				address: SUBSTRATE_ADDRESS,
				amount: '100',
				asset: Assets.KSM,
				chain: Chains.AssetHubKusama,
			} as any)

			expect(session.params.teleportMode).toBe(TeleportModes.Expected)
		}, 20000)
	})
})
