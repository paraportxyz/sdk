import type { BaseDetails, BaseDetailsEvent } from '@/base/BaseManager'
import type { Route } from '@/types/common'
import type { TransactionDetails } from '@/types/transactions'
import type { Asset, Chain } from '@paraport/static'
import type { ObjectValues } from './utils'

export type TeleportEvent = BaseDetailsEvent

export type TeleportParams<Amount = bigint> = {
	/**
	 * The user address where funds will be sent from and to
	 */
	address: string
	/**
	 * The destination chain for the teleport
	 */
	chain: Chain
	/**
	 * The amount to teleport
	 */
	amount: Amount
	/**
	 * The asset to teleport
	 * @see Asset
	 */
	asset: Asset
	/**
	 * The teleport mode that determines how the amount is calculated
	 * @see TeleportMode
	 */
	teleportMode?: TeleportMode
}

export interface TeleportDetails
	extends BaseDetails<TeleportStatus, TeleportEvent> {
	id: string
	details: {
		address: string
		/**
		 * Gross amount sent from origin (includes fees when applicable)
		 */
		amount: bigint
		/**
		 * Net amount expected to be received on destination.
		 * Used to verify completion by comparing destination balance increase.
		 */
		receiveAmount: bigint
		asset: Asset
		route: Route
	}
	events: TeleportEvent[]
	timestamp: number
	checked: boolean
}

export const TeleportStatuses = {
	Pending: 'pending',
	Transferring: 'transferring',
	Waiting: 'waiting',
	Completed: 'completed',
	Failed: 'failed',
} as const

export type TeleportStatus = ObjectValues<typeof TeleportStatuses>

export const TeleportEventTypes = {
	TELEPORT_STARTED: 'teleport:started',
	TELEPORT_UPDATED: 'teleport:updated',
	TELEPORT_COMPLETED: 'teleport:completed',
} as const

export type TeleportEventType = ObjectValues<typeof TeleportEventTypes>

export type TeleportEventPayload = TeleportDetails & {
	transactions: TransactionDetails[]
}

export const TeleportModes = {
	/**
	 * Expected mode: I expect to have a specific amount (e.g., 0.5) arrive at the destination chain.
	 * The input amount will be calculated to ensure the expected output after fees.
	 */
	Expected: 'expected',

	/**
	 * Exact mode: I need to teleport exactly a specific amount (e.g., 0.5) to the destination chain.
	 * The exact amount specified will be sent from the source chain.
	 */
	Exact: 'exact',

	/**
	 * Only mode: I can only spend a specific maximum amount (e.g., 0.5) total.
	 * Ensures that the amount + transaction fee <= the specified amount.
	 */
	Only: 'only',
} as const

export type TeleportMode = ObjectValues<typeof TeleportModes>
