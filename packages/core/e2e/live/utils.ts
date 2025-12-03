import { describe } from 'vitest'
import type { Chain, Asset } from '@paraport/static'
import { Chains } from '@paraport/static'
import type { SDKConfig } from '@/types/common'
import { LogLevels, type LogLevel } from '@/types/sdk'
import BalanceService from '@/services/BalanceService'

export const LIVE_E2E_CHAINS = [Chains.CoretimePaseo, Chains.AssetHubPaseo, Chains.HydrationPaseo]

export const E2E_ENABLED = process.env.E2E_LIVE === '1'

export function e2eDescribe(name: string, fn: () => void): void {
  if (E2E_ENABLED) {
    ;(describe as any).sequential(name, fn)
  } else {
    ;(describe as any).skip(name, fn)
  }
}

const allChains = Object.values(Chains) as ReadonlyArray<Chain>
export const parseChainEnv = (value?: string): Chain => {
  if (!value || !(allChains as ReadonlyArray<string>).includes(value)) {
    throw new Error('E2E_CHAIN is required and must be a valid chain name')
  }
  return value as Chain
}

export async function makeSr25519SignerFromMnemonic(mnemonic: string) {
  const { cryptoWaitReady, mnemonicToMiniSecret, sr25519PairFromSeed, sr25519Sign } = await import('@polkadot/util-crypto')
  const { getPolkadotSigner } = await import('polkadot-api/signer')
  await cryptoWaitReady()
  const seed = mnemonicToMiniSecret(mnemonic)
  const pair = sr25519PairFromSeed(seed)
  return getPolkadotSigner(pair.publicKey, 'Sr25519', (input: Uint8Array) => sr25519Sign(input, pair))
}

export async function deriveAddressForChain(mnemonic: string, chain: Chain): Promise<string> {
  const { cryptoWaitReady, mnemonicToMiniSecret, sr25519PairFromSeed } = await import('@polkadot/util-crypto')
  const { encodeAddress } = await import('dedot/utils')
  await cryptoWaitReady()
  const seed = mnemonicToMiniSecret(mnemonic)
  const { publicKey } = sr25519PairFromSeed(seed)
  const { ss58Of } = await import('@/utils/chains')
  return encodeAddress(publicKey, ss58Of(chain))
}

export async function ensureAddress(address: string | undefined, mnemonic: string | undefined, chain: Chain): Promise<string> {
  if (address && address.length > 0) return address
  if (mnemonic && mnemonic.length > 0) return deriveAddressForChain(mnemonic, chain)
  throw new Error('E2E_ADDRESS or E2E_MNEMONIC is required')
}

export async function setupSDK(params: {
  mnemonic: string
  chains?: Chain[]
  logLevel?: LogLevel
}) {
  const { mnemonic, chains = LIVE_E2E_CHAINS, logLevel = LogLevels.INFO } = params

  const { default: ParaPortSDK } = await import('@/sdk/ParaPortSDK')
  const { default: BalanceService } = await import('@/services/BalanceService')
  const { Logger } = await import('@/services/LoggerService')
  const { default: PolkadotApiCls } = await import('@/services/PolkadotApi')

  const config: SDKConfig = {
    getSigner: async () => {
      if (!mnemonic) throw new Error('E2E_MNEMONIC is required for signing')
      return makeSr25519SignerFromMnemonic(mnemonic)
    },
    bridgeProtocols: ['XCM'],
    chains,
    logLevel,
  }

  const sdk = new ParaPortSDK(config as any)
  const papi = new PolkadotApiCls(config)
  const logger = new Logger({ minLevel: logLevel })
  const balancesSvc = new BalanceService(papi, logger)

  await sdk.initialize()

  return { sdk, balancesSvc, papi, logger, config }
}

export async function getTransferableBalance(
  balancesSvc: BalanceService,
  address: string,
  asset: Asset,
  chain: Chain,
): Promise<bigint> {
  const [b] = await balancesSvc.getBalances({ address, asset, chains: [chain] })
  return b?.transferable ?? 0n
}
