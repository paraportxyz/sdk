import type { Asset, Chain } from '@paraport/static'
import type { IInitializable } from '@/base/Initializable'
import type { Quote } from '@/types/common'
import type { TeleportParams } from '@/types/teleport'
import type {
	TransactionCallback,
	TransactionUnsubscribe,
} from '@/types/transactions'

/** Bridge protocol identifiers supported by the SDK. */
export type BridgeProtocol = 'XCM'

/** Parameters required for a bridge transfer. */
export type BridgeTransferParams = {
	amount: bigint
	from: Chain
	to: Chain
	address: string
	asset: Asset
}

/**
 * Interface for bridge adapter implementations.
 * Adapters produce quotes and execute transfers, emitting transaction updates.
 */
export interface BridgeAdapter extends IInitializable {
	protocol: BridgeProtocol
	/**
	 * Generates a bridge quote for the given teleport parameters.
	 * @param params - Teleport parameters
	 * @returns Quote or null if transfer is not feasible
	 */
	getQuote(params: TeleportParams): Promise<Quote | null>
	/**
	 * Executes a transfer and reports progress through the callback.
	 * @param params - Bridge transfer parameters
	 * @param callback - Receives transaction lifecycle updates
	 * @returns Unsubscribe function for the transfer watcher
	 */
	transfer(
		params: BridgeTransferParams,
		callback: TransactionCallback,
	): Promise<TransactionUnsubscribe>
	// getStatus(txHash: string): Promise<TransactionStatus>
}
