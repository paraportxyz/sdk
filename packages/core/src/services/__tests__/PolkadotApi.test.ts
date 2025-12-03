import { beforeEach, describe, expect, it, vi } from 'vitest'
import PolkadotApi from '@/services/PolkadotApi'
import { Chains, PROVIDERS } from '@paraport/static'
import type { SDKConfig } from '@/types/common'

const createClientMock = vi.fn()
const getWsProviderMock = vi.fn()
const withCompatMock = vi.fn()

vi.mock('polkadot-api', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    createClient: (...args: unknown[]) => createClientMock(...args),
  }
})

vi.mock('polkadot-api/ws-provider/web', () => ({
  getWsProvider: (...args: unknown[]) => getWsProviderMock(...args),
}))

vi.mock('polkadot-api/polkadot-sdk-compat', () => ({
  withPolkadotSdkCompat: (...args: unknown[]) => withCompatMock(...args),
}))

// Avoid loading heavy real descriptors and their deep dependencies
vi.mock('@/descriptors', () => ({
  ahk: {} as any,
  ahp: {} as any,
  ahpas: {} as any,
  copas: {} as any,
  dot: {} as any,
  hyd: {} as any,
  hydpas: {} as any,
  ksm: {} as any,
}))

describe('PolkadotApi', () => {
  let client: any

  beforeEach(() => {
    vi.clearAllMocks()

    getWsProviderMock.mockImplementation(({ endpoints }: any) => ({ endpoints }))
    withCompatMock.mockImplementation((provider: any) => provider)

    client = {
      getTypedApi: vi.fn().mockReturnValue({ TypedApi: true }),
      destroy: vi.fn(),
    }
    createClientMock.mockImplementation((_provider: any) => client)
  })

  it('creates and caches client per chain', () => {
    const api = new PolkadotApi({} as SDKConfig)

    const first = api.getInstance(Chains.Kusama)
    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(first.api).toEqual({ TypedApi: true })
    expect(client.getTypedApi).toHaveBeenCalledTimes(1)

    const second = api.getInstance(Chains.Kusama)
    expect(createClientMock).toHaveBeenCalledTimes(1) // cached
    expect(second.api).toEqual({ TypedApi: true })
    expect(client.getTypedApi).toHaveBeenCalledTimes(2) // getTypedApi called per access
  })

  it('uses endpoints override from SDKConfig when provided', () => {
    const customEndpoints = ['wss://custom.endpoint.example']
    const api = new PolkadotApi({
      endpoints: {
        [Chains.Kusama]: customEndpoints,
      },
    } as SDKConfig)

    api.getInstance(Chains.Kusama)

    // getWsProvider receives the override
    expect(getWsProviderMock).toHaveBeenCalledWith({ endpoints: customEndpoints })

    // Non-overridden chain falls back to PROVIDERS from static
    api.getInstance(Chains.Polkadot)
    const calledWith = getWsProviderMock.mock.calls.find(
      ([arg]: any[]) => Array.isArray(arg?.endpoints) && arg.endpoints[0] === PROVIDERS.Polkadot[0],
    )
    expect(calledWith).toBeTruthy()
  })

  it('closeAll destroys clients and allows recreation', () => {
    const api = new PolkadotApi({} as SDKConfig)
    api.getInstance(Chains.Kusama)
    api.getInstance(Chains.Polkadot)
    expect(createClientMock).toHaveBeenCalledTimes(2)

    api.closeAll()
    expect(client.destroy).toHaveBeenCalled() // at least called for last client instance

    // After closeAll, new instances are created again
    api.getInstance(Chains.Kusama)
    expect(createClientMock).toHaveBeenCalledTimes(3)
  })
})
