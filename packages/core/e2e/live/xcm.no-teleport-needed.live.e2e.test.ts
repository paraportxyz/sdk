import { expect, it } from 'vitest'
import { Assets, type Chain, type Asset } from '@paraport/static'
import { e2eDescribe, parseChainEnv, ensureAddress, setupSDK, getTransferableBalance } from './utils'

const ASSET: Asset = Assets.PAS
const MNEMONIC = process.env.E2E_MNEMONIC || ''

e2eDescribe('LIVE: XCM No Teleport Needed', () => {
  it('does not require teleport when destination has enough balance', async () => {
    const CHAIN: Chain = parseChainEnv(process.env.E2E_CHAIN)
    const ADDRESS = await ensureAddress(process.env.E2E_ADDRESS, MNEMONIC, CHAIN)
    const { sdk, balancesSvc } = await setupSDK({
      mnemonic: MNEMONIC
    })

    // Read current destination balance
    const transferable = await getTransferableBalance(balancesSvc, ADDRESS, ASSET, CHAIN)

    // If no balance, we cannot assert this scenario reliably; exit early
    if (transferable <= 0n) {
      // eslint-disable-next-line no-console
      console.warn('Skipping assertions: destination transferable is 0. Fund the account to enable this test case.')
      return
    }

    // Choose an amount that is already covered by current balance
    const desired = transferable // hasEnoughBalance should be true

    const session = await sdk.initSession({
      address: ADDRESS,
      amount: String(desired),
      chain: CHAIN,
      asset: ASSET,
    })

    expect(session.funds.needed).toBe(false)
    expect(session.funds.available).toBe(false)
    expect(session.funds.noFundsAtAll).toBe(false)
    expect(session.quotes.selected).toBeUndefined()

    // Executing should fail with a clear error since teleport is not needed
    await expect(sdk.executeSession(session.id)).rejects.toThrow("No quote selected for the session")
  }, 120_000)
})
