import { describe, expect, it, vi } from 'vitest'
import { createApp, h } from 'vue'
import { baseProps, mockCoreSdk, mockIntegratedStub, mockUseSdk } from './utils'

describe('paraport props/reactivity', () => {
  it('forwards props to store on mount and updates on remount', async () => {
    vi.resetModules()
    const store = mockUseSdk()
    mockIntegratedStub()
    mockCoreSdk()
    const { default: Paraport } = await import('../Paraport.vue')
    const container = document.createElement('div')
    document.body.appendChild(container)

    // First mount
    let app = createApp(() => h(Paraport as any, { ...baseProps, label: 'A', disabled: false, appearance: { color: 'blue' }, ui: { addFunds: false } } as any))
    app.mount(container)

    expect(store.setTeleportParams).toHaveBeenCalledTimes(1)
    expect(store.setSdk).toHaveBeenCalledTimes(1)
    expect(store.setDisplayMode).toHaveBeenCalledTimes(1)
    expect(store.setUi).toHaveBeenCalledTimes(1)
    expect(store.setAppearance).toHaveBeenCalled()
    expect(store.setLabel).toHaveBeenCalledWith('A')
    expect(store.setDisabled).toHaveBeenCalledWith(false)

    app.unmount()

    // Remount with different props to simulate update
    app = createApp(() => h(Paraport as any, { ...baseProps, label: 'B', disabled: true } as any))
    app.mount(container)

    expect(store.setLabel).toHaveBeenCalledWith('B')
    expect(store.setDisabled).toHaveBeenCalledWith(true)

    app.unmount()
  })
})
