import type PolkadotApi from '@/services/PolkadotApi'
import type { Logger } from '@/services/LoggerService'
import type { Chain } from '@paraport/static'
import type { PolkadotSigner } from 'polkadot-api'
import { vi } from 'vitest'

export function makePolkadotApiMock(
  freeByChain: Partial<Record<Chain, bigint>> = {},
  watchImpl?: (chain: Chain, cb: (arg: any) => void) => { unsubscribe: () => void }
): PolkadotApi {
  return {
    getInstance: (chain: Chain) => ({
      api: {
        query: {
          System: {
            Account: {
              getValue: vi.fn(async (_addr: string) => ({ data: { free: freeByChain[chain] ?? 0n } })),
              watchValue: (_addr: string) => ({
                subscribe: (cb: (arg: any) => void) =>
                  (watchImpl ? watchImpl(chain, cb) : { unsubscribe: vi.fn() }),
              }),
            },
          },
        },
      },
    })
  } as unknown as PolkadotApi
}

export function makeLoggerMock(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger
}

export function dummySigner(): PolkadotSigner {
  return {} as unknown as PolkadotSigner
}

export function makeParaspellBuilderModuleMock(fees: { origin: bigint; destination: bigint } = { origin: 10n, destination: 5n }) {
  const builderChain = {
    from: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
    currency: vi.fn().mockReturnThis(),
    recipient: vi.fn().mockReturnThis(),
    sender: vi.fn().mockReturnThis(),
    feeAsset: vi.fn().mockReturnThis(),
    dryRun: vi.fn().mockResolvedValue({}),
    getXcmFee: vi.fn().mockResolvedValue({ origin: { fee: fees.origin }, destination: { fee: fees.destination } }),
    build: vi.fn().mockResolvedValue({ signSubmitAndWatch: vi.fn() }),
  }
  return {
    Builder: vi.fn().mockReturnValue(builderChain),
  }
}
