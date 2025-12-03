import { describe, expect, it, vi } from 'vitest'
import { createApp, h } from 'vue'
import { baseProps, mockCoreSdk, mockIntegratedStub, mockUseSdk } from './utils'

describe('paraport event bridging', () => {
  it('re-emits eventBus events as component events', async () => {
    vi.resetModules()
    const store = mockUseSdk()
    mockIntegratedStub()
    mockCoreSdk()
    const { default: Paraport } = await import('../Paraport.vue')
    const { default: eventBus } = await import('@/utils/event-bus')

    const calls = { ready: [] as any[], submit: [] as any[], addFunds: 0, completed: 0 }

    const container = document.createElement('div')
    document.body.appendChild(container)

    // ensure sdk looks initialized for composables using it
    store.setSdk({ destroy() {}, isInitialized: () => true } as any)

    const app = createApp(() => h(Paraport as any, {
      ...baseProps,
      onReady: (...args: any[]) => { calls.ready.push(args) },
      onSubmit: (...args: any[]) => { calls.submit.push(args) },
      onAddFunds: () => { calls.addFunds += 1 },
      onCompleted: () => { calls.completed += 1 },
    } as any))

    app.mount(container)

    const payload = { id: 'sess-1' }
    eventBus.emit('session:ready', payload as any)
    eventBus.emit('teleport:submit', { autoteleport: true, completed: false })
    eventBus.emit('session:add-funds')

    // Expect both 'completed' and 'ready' on session:ready, as wired in component
    expect(calls.ready.length).toBe(1)
    expect(calls.ready[0][0]).toEqual(payload)
    expect(calls.completed).toBe(1)

    expect(calls.submit.length).toBe(1)
    expect(calls.submit[0][0]).toEqual({ autoteleport: true, completed: false })

    expect(calls.addFunds).toBe(1)

    app.unmount()
  })
})
