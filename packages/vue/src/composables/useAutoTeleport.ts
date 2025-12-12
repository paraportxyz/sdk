import type { TeleportEventPayload, TeleportSession } from '@paraport/core'
import {
  AutoTeleportSessionEventTypes,
  TeleportEventTypes,
  TeleportSessionStatuses,
} from '@paraport/core'
import { computed, nextTick, onBeforeMount, ref, watch } from 'vue'
import { useSdk } from '@/composables/useSdk'
import eventBus from '@/utils/event-bus'

const TELEPORT_EVENTS = [
  TeleportEventTypes.TELEPORT_COMPLETED,
  TeleportEventTypes.TELEPORT_STARTED,
  TeleportEventTypes.TELEPORT_UPDATED,
]

const SESSION_EVENTS = [
  AutoTeleportSessionEventTypes.SESSION_CREATED,
  AutoTeleportSessionEventTypes.SESSION_UPDATED,
  AutoTeleportSessionEventTypes.SESSION_DELETED,
]

export default () => {
  const session = ref<TeleportSession>()
  const autoteleport = ref<TeleportEventPayload>()
  const loading = ref(true)

  const selectedQuote = computed(() => session.value?.quotes.selected)

  const { sdk, params } = useSdk()

  const exec = async () => {
    if (session.value && selectedQuote.value) {
      await sdk.value.executeSession(session.value.id)
    }
  }

  const attachListeners = () => {
    for (const event of SESSION_EVENTS) {
      sdk.value.onSession(event, (payload) => {
        if (
          payload.status === TeleportSessionStatuses.Ready
          && !session.value
        ) {
          eventBus.emit('session:ready', payload)
        }

        session.value = payload
      })
    }

    for (const event of TELEPORT_EVENTS) {
      sdk.value.onTeleport(event, (payload) => {
        autoteleport.value = payload

        if (event === TeleportEventTypes.TELEPORT_COMPLETED) {
          eventBus.emit('teleport:completed')
        }
      })
    }
  }

  const retry = async () => {
    if (!session.value)
      return

    sdk.value.retrySession(session.value.id)
  }

  const isReady = computed(() => session.value?.status === TeleportSessionStatuses.Ready)
  const isCompleted = computed(() => session.value?.status === TeleportSessionStatuses.Completed)
  const isAvailable = computed(() => true) // TODO check if chain has autoteleport support

  const canAutoTeleport = computed(() => isAvailable.value && Boolean(session.value?.funds.available))
  const hasNoFundsAtAll = computed(() => Boolean(session.value?.funds.noFundsAtAll))
  const insufficientFunds = computed(() => isReady.value && hasNoFundsAtAll.value)
  const needsAutoTeleport = computed(() => Boolean(session.value?.funds.needed))
  const hasEnoughInCurrentChain = computed(() => !needsAutoTeleport.value && isReady.value)

  onBeforeMount(async () => {
    if (!sdk.value.isInitialized()) {
      await sdk.value.initialize()
    }

    attachListeners()

    session.value = await sdk.value.initSession(params.value)

    loading.value = false
  })

  watch(params, async (params) => {
    if (session.value) {
      // Wait for Vue to flush its updates and render
      await nextTick()

      await sdk.value.updateSessionParams(session.value.id, params)
    }
  })

  return {
    needsAutoTeleport,
    hasEnoughInCurrentChain,
    exec,
    autoteleport,
    session,
    retry,
    isReady,
    isAvailable,
    isCompleted,
    canAutoTeleport,
    hasNoFundsAtAll,
    insufficientFunds,
  }
}
