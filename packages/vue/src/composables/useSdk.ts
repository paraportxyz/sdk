import type { ParaPortSDK, TeleportParams } from '@paraport/core'
import type { Ref } from 'vue'
import type { DisplayMode, ParaportParams } from '@/types'
import { ref } from 'vue'
import { DisplayModes } from '@/types'

const sdk = ref() as Ref<ParaPortSDK>
const params = ref() as Ref<TeleportParams<string>>
const label = ref<string>('')
const disabled = ref<boolean>(false)
const displayMode = ref<DisplayMode>(DisplayModes.Integrated)
const ui = ref<ParaportParams['ui']>({ addFunds: true })
const appearance = ref<Record<string, string>>({})

export function useSdk() {
  const setSdk = (newSdk: ParaPortSDK) => {
    sdk.value = newSdk
  }

  const setTeleportParams = (teleportParams: TeleportParams<string>) => {
    params.value = teleportParams
  }

  const setLabel = (newLabel: string) => {
    label.value = newLabel
  }

  const setDisabled = (isDisabled: boolean) => {
    disabled.value = isDisabled
  }

  const setDisplayMode = (mode: DisplayMode) => {
    displayMode.value = mode
  }

  const setUi = (newUi: Partial<ParaportParams['ui']>) => {
    ui.value = { ...ui.value, ...newUi }
  }

  const setAppearance = (a?: Record<string, string>) => {
    appearance.value = a ?? {}
  }

  return {
    sdk,
    params,
    label,
    disabled,
    displayMode,
    setSdk,
    setTeleportParams,
    setLabel,
    setDisabled,
    setDisplayMode,
    ui,
    setUi,
    appearance,
    setAppearance,
  }
}
