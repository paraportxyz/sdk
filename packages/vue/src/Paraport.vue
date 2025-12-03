<script setup lang="ts">
import type {
  DisplayMode,
  ParaportEvents,
  ParaportParams,
} from '@/types'
import { ParaPortSDK } from '@paraport/core'
import { onUnmounted, watchEffect } from 'vue'
import IntegratedParaport from '@/components/integrated/Integrated.vue'
import { useSdk } from '@/composables/useSdk'
import useSystemDarkMode from '@/composables/useSystemDarkMode'
import {

  DisplayModes,

} from '@/types'
import eventBus from '@/utils/event-bus'

const props = defineProps<ParaportParams>()
const emits = defineEmits<ParaportEvents>()

useSystemDarkMode(props.themeMode ?? 'auto')

const store = useSdk()
const { displayMode, appearance } = useSdk()

const sdk = new ParaPortSDK({
  getSigner: props.getSigner,
  logLevel: props.logLevel,
  endpoints: props.endpoints,
  chains: props.chains,
})

store.setSdk(sdk)
store.setTeleportParams({
  chain: props.chain,
  address: props.address,
  asset: props.asset,
  amount: props.amount,
  teleportMode: props.teleportMode,
})

props.ui && store.setUi(props.ui)
props.appearance && store.setAppearance(props.appearance)
store.setDisplayMode(
  props.displayMode || (DisplayModes.Integrated as DisplayMode),
)

watchEffect(() => {
  store.setLabel(props.label || '')
  store.setDisabled(props.disabled || false)
  store.setAppearance(props.appearance)
})

eventBus.on('session:ready', () => emits('completed'))
eventBus.on('session:add-funds', () => emits('addFunds'))
eventBus.on('session:ready', (...args) => emits('ready', ...args))
eventBus.on('teleport:submit', (...args) => emits('submit', ...args))

function destroy() {
  store.sdk.value.destroy()
}

onUnmounted(destroy)
</script>

<template>
  <div class="paraport pp-bg-transparent" :style="appearance">
    <IntegratedParaport v-if="displayMode === DisplayModes.Integrated" />
  </div>
</template>
