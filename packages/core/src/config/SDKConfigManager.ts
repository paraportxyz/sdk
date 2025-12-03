import ConfigValidationError from '@/errors/ConfigError'
import type { SDKConfig } from '@/types/common'
import { LogLevels } from '@/types/sdk'
import { Chains } from '@paraport/static'

/** Utilities for validating and enriching SDK configuration. */
export class SDKConfigManager {
	/**
	 * Validates user-provided SDK config.
	 * @param config - SDK configuration
	 * @throws ConfigValidationError when config is invalid
	 */
	public static validateConfig(config: SDKConfig) {
		if (!config.bridgeProtocols?.length) {
			throw new ConfigValidationError(
				'At least one bridge protocol must be specified',
			)
		}
	}

	/**
	 * Merges user config with sensible defaults.
	 * @param config - Partial SDK configuration
	 * @returns Normalized, validated configuration
	 */
	public static getDefaultConfig(config: SDKConfig<false>): SDKConfig {
		return {
			...config,
			bridgeProtocols: config.bridgeProtocols ?? ['XCM'],
			logLevel: config.logLevel ?? LogLevels.INFO,
			chains: config.chains ?? Object.values(Chains),
		}
	}
}
