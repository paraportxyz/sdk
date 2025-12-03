import { USER_ADDRESS, AMOUNT, ENDPOINTS, CHAIN, ASSET, CHAINS, getSigner } from '../utils'
import { createApp, h } from 'vue'
import { ParaportPlugin, Paraport } from '@paraport/vue'
import '@paraport/vue/style'

const app = createApp({
  render() {
    return h(
      Paraport,
      {
        label: 'Mint',
        address: USER_ADDRESS,
        amount: AMOUNT,
        chain: CHAIN,
        asset: ASSET,
        onReady: this.onReady,
        onAddFunds: this.onAddFunds,
        onCompleted: this.onCompleted,
        onSubmit: this.onSubmit,
        getSigner,
        logLevel: 'DEBUG',
        endpoints: ENDPOINTS,
        chains: CHAINS
      }
    )
  },
  methods: {
    onReady(session) {
      console.log('🚀 ParaPort ready!', session)
    },
    onAddFunds() {
      console.log('💰 Add funds button pressed')
    },
    onCompleted() {
      console.log('✅ Auto-teleport successfully completed!')
    },
    onSubmit({ autoteleport, completed }) {
      console.log('📦 Submit button pressed')
      console.log('💥 Autoteleport: ', autoteleport)
      console.log('✅ Completed: ', completed)
    }
  }
})

app.use(ParaportPlugin)

app.mount('#root')
