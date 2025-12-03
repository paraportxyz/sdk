import { describe, expect, it, vi } from 'vitest'
import { mockCoreSdk, mockIntegratedStub, mockUseSdk, mountParaport } from './utils'

describe('paraport mount (vue)', () => {
  it('renders root and applies appearance styles', async () => {
    vi.resetModules()
    mockUseSdk()
    mockIntegratedStub({ withElement: true })
    mockCoreSdk()

    const { app, container } = await mountParaport({ amount: '0', appearance: { background: 'red' } })

    const root = container.querySelector('div.paraport') as HTMLDivElement
    expect(root).toBeTruthy()
    expect(root.getAttribute('style') || '').toContain('background: red')

    // Child stub renders as well
    expect(container.querySelector('[data-testid="integrated-stub"]')!.nodeName).toBeDefined()
    app.unmount()
  })
})
