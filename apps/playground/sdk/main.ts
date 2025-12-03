import '@paraport/sdk/style'
import * as paraport from '@paraport/sdk'
import { USER_ADDRESS, AMOUNT, ENDPOINTS, CHAIN, CHAINS, ASSET, getSigner } from '../utils'

const main = async () => {
  paraport.init({
    integratedTargetId: 'root',
    label: 'Mint',
  	address: USER_ADDRESS,
		amount: AMOUNT,
		chain: CHAIN,
		chains: CHAINS,
		asset: ASSET,
    endpoints: ENDPOINTS,
    logLevel: 'DEBUG',
    getSigner,
    onReady: (session) => {
      console.log('🚀 ParaPort ready!', session)
    },
    onSubmit: ({ autoteleport, completed }) => {
        console.log('📦 Submit button pressed')
        console.log('💥 Autoteleport: ', autoteleport)
        console.log('✅ Completed: ', completed)
    },
    onCompleted: () => {
        console.log('✅ Auto-teleport successfully completed!')
    },
    onAddFunds: () => {
        console.log('💰 Add funds button pressed')
    },
  })
}

main()
