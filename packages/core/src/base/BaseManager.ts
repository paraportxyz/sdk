import type { GenericEmitter, GenericEvent } from '@/base/GenericEmitter'

/**
 * Generic base manager for handling item state and event emission.
 *
 * @typeParam DetailsType - Item shape managed by this class
 * @typeParam StatusType - Status union for the item lifecycle
 * @typeParam EventType - Event payload structure stored on each item
 * @typeParam EventTypeString - Event channel key type
 * @typeParam EventPayload - Payload emitted to subscribers
 * @typeParam OnUpdateParams - Additional fields allowed during status updates
 */
export interface BaseDetails<StatusType, EventType> {
	id: string
	status: StatusType
	events: EventType[]
	timestamp: number
	error?: string
}

export interface BaseDetailsEvent<T = unknown> {
	type: string
	timestamp: number
	data: T
}

/**
 * Provides core list management utilities and a typed event emitter.
 * Extend this to implement domain-specific managers.
 */
export class BaseManager<
	DetailsType extends BaseDetails<StatusType, EventType>,
	StatusType,
	EventType extends BaseDetailsEvent,
	EventTypeString extends string,
	EventPayload = DetailsType,
	OnUpdateParams = Partial<DetailsType>,
> {
	protected items: Map<string, DetailsType> = new Map()
	protected eventEmitter: GenericEmitter<EventPayload, EventTypeString>

	constructor(eventEmitter: GenericEmitter<EventPayload, EventTypeString>) {
		this.eventEmitter = eventEmitter
	}

	/**
	 * Gets an item by id.
	 * @param id - Item identifier
	 * @returns The item or undefined
	 */
	getItem(id: string): DetailsType | undefined {
		return this.items.get(id)
	}

	/**
	 * Returns items matching a predicate.
	 * @param predicate - Filter function
	 * @returns Array of matching items
	 */
	getItemsWhere(predicate: (item: DetailsType) => boolean): DetailsType[] {
		return Array.from(this.items.values()).filter(predicate)
	}

	/**
	 * Returns all items.
	 * @returns Array of all items
	 */
	getAllItems(): DetailsType[] {
		return Array.from(this.items.values())
	}

	/**
	 * Removes an item by id.
	 * @param id - Item identifier
	 * @returns True if the item existed and was removed
	 */
	removeItem(id: string): boolean {
		return this.items.delete(id)
	}

	/**
	 * Appends an event entry to an item.
	 * @param id - Item identifier
	 * @param event - Event payload
	 */
	addEvent(id: string, event: EventType): void {
		const item = this.items.get(id)
		if (!item) return

		const updatedItem = {
			...item,
			events: [...item.events, event],
		}

		this.setItem(id, updatedItem)
	}

	/**
	 * Updates status and appends a status-update event.
	 * @param id - Item identifier
	 * @param status - New status value
	 * @param params - Optional extra fields to merge into the item
	 */
	updateStatus(id: string, status: StatusType, params?: OnUpdateParams): void {
		const item = this.items.get(id)
		if (!item) return

		const newEvent: BaseDetailsEvent = {
			type: 'status-update',
			timestamp: Date.now(),
			data: {
				status: status,
				// Access error from params if provided, without constraining OnUpdateParams
				error: (
					params as Partial<BaseDetails<StatusType, EventType>> | undefined
				)?.error,
			},
		}

		const updatedItem: DetailsType = {
			...item,
			status,
			...params,
			events: [...item.events, newEvent],
		}

		this.setItem(id, updatedItem)
	}

	/**
	 * Merges partial updates into an item.
	 * @param id - Item identifier
	 * @param updates - Partial item updates
	 * @param emitUpdate - Whether to emit an update event (default true)
	 * @returns The updated item or undefined if not found
	 */
	updateItem(
		id: string,
		updates: Partial<DetailsType>,
		emitUpdate = true,
	): DetailsType | undefined {
		const item = this.items.get(id)

		if (!item) return undefined

		const updatedItem: DetailsType = {
			...item,
			...updates,
		}

		this.setItem(id, updatedItem, emitUpdate)

		return updatedItem
	}

	/**
	 * Emits an update event for the provided payload.
	 * @param item - Event payload
	 */
	protected emitUpdate(item: EventPayload): void {
		this.eventEmitter.emit({ type: this.getUpdateEventType(), payload: item })
	}

	/**
	 * Must be implemented by subclasses to specify the update event channel.
	 * @returns Event channel key
	 */
	protected getUpdateEventType(): EventTypeString {
		throw new Error('Method not implemented.')
	}

	/**
	 * Maps internal item to the external event payload shape.
	 * @param item - Internal item
	 * @returns Event payload
	 */
	protected getEmitUpdateEventPayload(item: unknown): EventPayload {
		return item as EventPayload
	}

	/**
	 * Stores an item and optionally emits an update event.
	 * @param id - Item identifier
	 * @param item - Item value
	 * @param emitUpdate - Whether to emit the update event
	 */
	protected setItem(id: string, item: DetailsType, emitUpdate = true): void {
		this.items.set(id, item)

		if (emitUpdate) {
			this.emitUpdate(this.getEmitUpdateEventPayload(item))
		}
	}

	/**
	 * Subscribes to events of a given type.
	 * @param eventType - Event channel key
	 * @param callback - Handler function for emitted payloads
	 * @returns Unsubscribe function
	 */
	subscribe(
		eventType: EventTypeString,
		callback: (item: EventPayload) => void,
	): () => void {
		const subscription = (
			event: GenericEvent<EventPayload, EventTypeString>,
		) => {
			callback(event.payload)
		}

		this.eventEmitter.subscribe(eventType, subscription)

		return () => this.eventEmitter.unsubscribe(eventType, subscription)
	}
}
