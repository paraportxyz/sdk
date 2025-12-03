import { describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, resolveComponent } from 'vue'

// Mock the heavy Paraport component used by the plugin to avoid network and side effects
vi.mock('../Paraport.vue', () => ({
  default: defineComponent({
    name: 'Paraport',
    setup() {
      return () => h('div', { 'data-testid': 'stub-paraport' })
    },
  }),
}))

describe('vue paraport plugin', () => {
  it('registers and renders the Paraport component', async () => {
    const { ParaportPlugin } = await import('../index')
    const container = document.createElement('div')
    document.body.appendChild(container)

    const App = defineComponent({
      name: 'App',
      setup() {
        const Paraport = resolveComponent('Paraport')
        return () => h(Paraport as any)
      },
    })

    const app = createApp(App)
    app.use(ParaportPlugin)
    app.mount(container)

    const el = container.querySelector('[data-testid="stub-paraport"]')
    expect(el).toBeTruthy()

    app.unmount()
    expect(container.innerHTML).toBe('')
  })
})
