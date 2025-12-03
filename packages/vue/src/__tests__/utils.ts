import type { Ref } from 'vue'
import { vi } from 'vitest'
import { createApp, h, ref } from 'vue'

export interface StoreMock {
  sdk: Ref<any>
  params: Ref<any>
  label: Ref<string>
  disabled: Ref<boolean>
  displayMode: Ref<any>
  ui: Ref<any>
  appearance: Ref<Record<string, string>>
  setSdk: (sdk: any) => void
  setTeleportParams: (p: any) => void
  setLabel: (v: string) => void
  setDisabled: (v: boolean) => void
  setDisplayMode: (v: any) => void
  setUi: (v: any) => void
  setAppearance: (v?: Record<string, string>) => void
}

export function mockUseSdk(): StoreMock {
  const sdk = ref<any>(null)
  const params = ref<any>(null)
  const label = ref('')
  const disabled = ref(false)
  const displayMode = ref('Integrated' as any)
  const ui = ref({ addFunds: true })
  const appearance = ref<Record<string, string>>({})

  const setSdk = vi.fn((value: any) => {
    sdk.value = value
  })
  const setTeleportParams = vi.fn((p: any) => {
    params.value = p
  })
  const setLabel = vi.fn((v: string) => {
    label.value = v
  })
  const setDisabled = vi.fn((v: boolean) => {
    disabled.value = v
  })
  const setDisplayMode = vi.fn((v: any) => {
    (displayMode as any).value = v
  })
  const setUi = vi.fn((v: any) => {
    ui.value = { ...ui.value, ...v }
  })
  const setAppearance = vi.fn((v?: Record<string, string>) => {
    appearance.value = v ?? {}
  })

  vi.doMock('@/composables/useSdk', () => ({
    useSdk: () => ({
      sdk,
      params,
      label,
      disabled,
      displayMode,
      ui,
      appearance,
      setSdk,
      setTeleportParams,
      setLabel,
      setDisabled,
      setDisplayMode,
      setUi,
      setAppearance,
    }),
  }))

  return {
    sdk,
    params,
    label,
    disabled,
    displayMode,
    ui,
    appearance,
    setSdk,
    setTeleportParams,
    setLabel,
    setDisabled,
    setDisplayMode,
    setUi,
    setAppearance,
  }
}

export function mockIntegratedStub({ withElement = false } = {}) {
  vi.doMock('@/components/integrated/Integrated.vue', () => ({
    default: {
      name: 'IntegratedStub',
      setup: () => () => (withElement ? h('div', { 'data-testid': 'integrated-stub' }) : null),
    },
  }))
}

export function mockCoreSdk(options: { recordInstances?: boolean } = {}) {
  const instances: any[] = []
  vi.doMock('@paraport/core', () => ({
    ParaPortSDK: class {
      destroy = vi.fn()
      constructor(..._args: any[]) {
        if (options.recordInstances) {
          instances.push(this)
        }
      }
    },
  }))
  return { instances }
}

export const baseProps = {
  address: '5D4...',
  amount: '1',
  chain: 'Polkadot' as any,
  asset: 'DOT' as any,
  chains: ['Polkadot'] as any,
}

export async function mountParaport(props: Record<string, any> = {}) {
  const { default: Paraport } = await import('../Paraport.vue')
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp(() => h(Paraport as any, { ...baseProps, ...props } as any))
  app.mount(container)
  return { app, container }
}
