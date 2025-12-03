import { describe, expect, it, vi } from 'vitest'
import { createApp, h } from 'vue'
import { baseProps, mockCoreSdk, mockIntegratedStub, mockUseSdk } from './utils'

describe('paraport lifecycle', () => {
  it('calls sdk.destroy() on unmount', async () => {
    vi.resetModules()
    mockUseSdk()
    const { instances } = mockCoreSdk({ recordInstances: true })
    mockIntegratedStub()
    const { default: Paraport } = await import('../Paraport.vue')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const app = createApp(() => h(Paraport as any, baseProps as any))
    app.mount(container)

    // The component should have created one SDK instance
    expect(instances.length).toBeGreaterThan(0)
    const instance = instances[instances.length - 1]
    app.unmount()

    expect(instance.destroy).toHaveBeenCalled()
  })
})
