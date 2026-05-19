import type { Chain } from '@paraport/static'
import { decodeAddress, encodeAddress } from 'dedot/utils'
import { ss58Of } from '@/utils/chains'

/**
 * Re-encodes an address to the target chain's ss58 format.
 * @param address - Address string (any valid ss58 prefix)
 * @param chain - Target chain
 * @returns Address encoded for the target chain
 */
export const formatAddress = (address: string, chain: Chain) =>
	encodeAddress(address, ss58Of(chain))

/**
 * Validates if a string is a valid ss58 address.
 * @param address - Address string
 * @returns True when the address can be decoded/encoded
 */
export const isValidAddress = (address: string) => {
	try {
		encodeAddress(decodeAddress(address))
		return true
	} catch {
		return false
	}
}
