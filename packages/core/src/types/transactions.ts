import type { Chain } from '@paraport/static'
import type { BaseDetails, BaseDetailsEvent } from '@/base/BaseManager'
import type { BridgeTransferParams } from '@/types/bridges'
import type { ObjectValues } from './utils'

/** Transaction event channels. */
export const TransactionEventTypes = {
	TRANSACTION_STARTED: 'transaction:started',
	TRANSACTION_UPDATED: 'transaction:updated',
	TRANSACTION_PROCESSING: 'transaction:processing',
	TRANSACTION_COMPLETED: 'transaction:completed',
	TRANSACTION_FAILED: 'transaction:failed',
} as const

export type TransactionEventType = ObjectValues<typeof TransactionEventTypes>

/** Transaction status values. */
export const TransactionStatuses = {
	Broadcast: 'broadcast',
	Casting: 'casting',
	Sign: 'sign',
	Block: 'block',
	Finalized: 'finalized',
	Unknown: '',
	Cancelled: 'cancelled',
} as const

export type TransactionStatus = ObjectValues<typeof TransactionStatuses>

/** Transaction type values. */
export const TransactionTypes = {
	Teleport: 'teleport',
} as const

export type TransactionType = ObjectValues<typeof TransactionTypes>

/**
 * Details tracked for a single transaction in a teleport flow.
 */
export interface TransactionDetails
	extends BaseDetails<
		TransactionStatus,
		BaseDetailsEvent<{ status: TransactionStatus; error?: string }>
	> {
	chain: Chain
	details: BridgeTransferParams
	teleportId: string
	type: TransactionType
	order: number
	txHash?: string
	succeeded?: boolean
	unsubscribe?: TransactionUnsubscribe
}

/**
 * Callback invoked with transaction lifecycle updates.
 */
export type TransactionCallback = (
	params:
		| {
				status: typeof TransactionStatuses.Finalized
				txHash: string
				error?: string
		  }
		| {
				status: typeof TransactionStatuses.Block
				txHash: string
				error?: string
		  }
		| {
				status: typeof TransactionStatuses.Block
				txHash: string
				error?: string
		  }
		| {
				status: Exclude<
					TransactionStatus,
					| typeof TransactionStatuses.Finalized
					| typeof TransactionStatuses.Block
				>
				error?: string
				txHash?: string
		  },
) => void

/**
 * Function that unsubscribes the underlying transaction watcher.
 */
export type TransactionUnsubscribe = undefined | (() => void) // todo remove
