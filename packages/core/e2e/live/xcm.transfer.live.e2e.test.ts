import { expect, it } from 'vitest'
import { Assets, type Chain, type Asset } from '@paraport/static'
import { TeleportEventTypes } from '@/types/teleport'
import { e2eDescribe, parseChainEnv, ensureAddress, setupSDK, getTransferableBalance } from './utils'

const ASSET: Asset = Assets.PAS
const MNEMONIC = process.env.E2E_MNEMONIC || ''

e2eDescribe('LIVE: XCM Auto Top-up', () => {
  it('tops up the specified chain when feasible', async () => {
    const CHAIN: Chain = parseChainEnv(process.env.E2E_CHAIN)
    const ADDRESS = await ensureAddress(process.env.E2E_ADDRESS, MNEMONIC, CHAIN)
    const { sdk, balancesSvc } = await setupSDK({
      mnemonic: MNEMONIC,
    })

    // 1. Read balance on the destination chain
    const balance = await getTransferableBalance(balancesSvc, ADDRESS, ASSET, CHAIN)

    // 2. Request a minimal top-up: desired = current + 0.5 PAS
    const desired = balance + 5000000000n

    const sessionToExecute = await sdk.initSession({
      address: ADDRESS,
      amount: String(desired),
      chain: CHAIN,
      asset: ASSET,
    })

    expect(sessionToExecute.funds.needed).toBeTruthy()
    expect(sessionToExecute.funds.available).toBeTruthy()
    expect(sessionToExecute.quotes.selected).toBeDefined()

    // 3. Execute and assert dest balance increases
    await sdk.executeSession(sessionToExecute.id)

    // 4. Wait and check balance to increases
    await new Promise((resolve) => {
      sdk.onTeleport(TeleportEventTypes.TELEPORT_COMPLETED, () => {
        resolve(true)
      })
    })

    const after = await getTransferableBalance(balancesSvc, ADDRESS, ASSET, CHAIN)
    expect(after >= balance).toBe(true)
    expect(after >= desired).toBe(true)
  }, process.env.CI ? 240_000 : 180_000)
})
