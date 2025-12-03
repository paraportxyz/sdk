import { expect, it } from 'vitest'
import { Assets, type Chain, type Asset } from '@paraport/static'
import { e2eDescribe, parseChainEnv, ensureAddress, setupSDK, getTransferableBalance } from './utils'

const ASSET: Asset = Assets.PAS
const MNEMONIC = process.env.E2E_MNEMONIC || ''

e2eDescribe('LIVE: XCM Insufficient Funds', () => {
  it('needs teleport but has insufficient origin funds (no quotes)', async () => {
    const CHAIN: Chain = parseChainEnv(process.env.E2E_CHAIN)
    const ADDRESS = await ensureAddress(process.env.E2E_ADDRESS, MNEMONIC, CHAIN)
    const { sdk, balancesSvc } = await setupSDK({
      mnemonic: MNEMONIC
    })

    // Read balance on the destination chain to build an unreachable desired amount
    const balance = await getTransferableBalance(balancesSvc, ADDRESS, ASSET, CHAIN)

    // Pick a huge desired target so origin can’t possibly cover it
    const desired = balance + 1_000_000_000_000_000n // 1e15 planck

    const session = await sdk.initSession({
      address: ADDRESS,
      amount: String(desired),
      chain: CHAIN,
      asset: ASSET,
    })

    expect(session.funds.needed).toBe(true)
    expect(session.funds.available).toBe(false)
    expect(session.funds.noFundsAtAll).toBe(true)
    expect(session.quotes.selected).toBeUndefined()

    // Executing should fail since there is no selected quote
    await expect(sdk.executeSession(session.id)).rejects.toThrow(/No quote selected/i)
  }, 120_000)
})
