import type { Asset, Chain } from '@paraport/static'
import { getAssetExistentialDeposit } from './assets'

/**
 * Computes transferable balance after subtracting chain existential deposit.
 * @param amount - Free balance
 * @param chain - Chain identifier
 * @returns Transferable balance
 */
export const transferableBalanceOf = (
	amount: bigint,
	chain: Chain,
	asset: Asset,
): bigint => {
	const ed = BigInt(getAssetExistentialDeposit(chain, asset) ?? 0)

	return BigInt(Math.max(0, Number(amount - ed)))
}
