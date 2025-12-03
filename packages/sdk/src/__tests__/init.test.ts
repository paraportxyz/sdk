import { describe, expect, it, vi } from 'vitest'
import { h, type Component } from 'vue'

// Mock @paraport/vue to avoid bringing in the full UI and network initializations
const setLabelSpy = vi.fn()
const setDisabledSpy = vi.fn()

vi.mock('@paraport/vue', () => {
  const ParaportStub: Component = {
    name: 'ParaportStub',
    setup() {
      return () => h('div', { 'data-testid': 'paraport-stub' })
    },
  }

  const install = vi.fn()

  return {
    Paraport: ParaportStub,
    default: { install },
    ParaportPlugin: { install },
    DisplayModes: { Integrated: 'Integrated' },
    useSdk: () => ({
      setLabel: setLabelSpy,
      setDisabled: setDisabledSpy,
    }),
  }
})

describe('sdk init', () => {
  it('mounts a Vue app into target element and returns controls', async () => {
    const { init } = await import('../index')
    const container = document.createElement('div')
    container.id = 'target'
    document.body.appendChild(container)

    const instance = init({
      integratedTargetId: 'target',
      amount: '0' as unknown as number,
      address: '5D4...',
      chain: 'Polkadot' as unknown as any,
      asset: 'DOT' as unknown as any,
      chains: ['Polkadot'] as unknown as any,
    } as any)

    // Mounted stub exists under target container
    const el = container.querySelector('[data-testid="paraport-stub"]')
    expect(el).toBeTruthy()

    // Update proxies to the store
    instance.update({ label: 'Label', disabled: true })
    expect(setLabelSpy).toHaveBeenCalledWith('Label')
    expect(setDisabledSpy).toHaveBeenCalledWith(true)

    // Destroy unmounts content
    instance.destroy()
    expect(container.innerHTML).toBe('')
  })

  it('throws if target element is missing', async () => {
    const { init } = await import('../index')
    expect(() =>
      init({
        integratedTargetId: 'missing',
        amount: '0' as unknown as number,
        address: '5D4...',
        chain: 'Polkadot' as unknown as any,
        asset: 'DOT' as unknown as any,
        chains: ['Polkadot'] as unknown as any,
      } as any),
    ).toThrowError('Target element not found: missing')
  })

  it('installs the Paraport Vue plugin', async () => {
    const { init } = await import('../index')
    const vue = await import('@paraport/vue')

    const container = document.createElement('div')
    container.id = 'target-plugin'
    document.body.appendChild(container)

    init({
      integratedTargetId: 'target-plugin',
      amount: '0' as unknown as number,
      address: '5D4...',
      chain: 'Polkadot' as unknown as any,
      asset: 'DOT' as unknown as any,
      chains: ['Polkadot'] as unknown as any,
    } as any)

    const install = (vue.ParaportPlugin.install as unknown as { mock: { calls: unknown[] } })
    expect(install.mock.calls.length).toBeGreaterThan(0)
  })
})
