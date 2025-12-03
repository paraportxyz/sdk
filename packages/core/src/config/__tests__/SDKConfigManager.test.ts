import { SDKConfigManager } from '@/config/SDKConfigManager'
import ConfigValidationError from '@/errors/ConfigError'
import type { SDKConfig } from '@/types/common'
import { LogLevels } from '@/types/sdk'
import { Chains } from '@paraport/static'
import { describe, expect, it } from 'vitest'

describe('SDKConfigManager', () => {
  const dummySigner = async () => null as any

  describe('validateConfig', () => {
    it('throws when bridgeProtocols is missing', () => {
      const cfg: SDKConfig = {
        // bridgeProtocols omitted on purpose
        chains: [Chains.Kusama],
        getSigner: dummySigner,
      }

      expect(() => SDKConfigManager.validateConfig(cfg)).toThrowError(
        ConfigValidationError,
      )
    })

    it('throws when bridgeProtocols is empty', () => {
      const cfg: SDKConfig = {
        bridgeProtocols: [],
        chains: [Chains.Kusama],
        getSigner: dummySigner,
      }

      expect(() => SDKConfigManager.validateConfig(cfg)).toThrowError(
        ConfigValidationError,
      )
    })
  })

  describe('getDefaultConfig', () => {
    it('applies sensible defaults when values are omitted', () => {
      const cfg: SDKConfig<false> = {
        // bridgeProtocols omitted
        // chains omitted
        chains: undefined,
        // logLevel omitted
        getSigner: dummySigner,
      }

      const normalized = SDKConfigManager.getDefaultConfig(cfg)

      expect(normalized.bridgeProtocols).toEqual(['XCM'])
      expect(normalized.logLevel).toBe(LogLevels.INFO)
      expect(normalized.chains).toEqual(Object.values(Chains))
    })

    it('preserves user-specified values (no overwrite)', () => {
      const cfg: SDKConfig<false> = {
        bridgeProtocols: ['XCM'],
        logLevel: LogLevels.DEBUG,
        chains: [Chains.Kusama],
        getSigner: dummySigner,
      }

      const normalized = SDKConfigManager.getDefaultConfig(cfg)

      expect(normalized.bridgeProtocols).toEqual(['XCM'])
      expect(normalized.logLevel).toBe(LogLevels.DEBUG)
      expect(normalized.chains).toEqual([Chains.Kusama])
    })
  })
})
