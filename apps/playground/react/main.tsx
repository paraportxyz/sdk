import { USER_ADDRESS, AMOUNT, getSigner, ASSET, CHAIN, CHAINS } from '../utils'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Paraport } from '@paraport/react'
import '@paraport/react/style'

const main = async () => {
  const rootElement = document.getElementById('root')
  if (rootElement) {
    const root = createRoot(rootElement)
    root.render(
      <React.StrictMode>
        <Paraport
          label="Mint"
          address={USER_ADDRESS}
          amount={AMOUNT}
          chain={CHAIN}
          chains={CHAINS}
          asset={ASSET}
          logLevel="DEBUG"
          getSigner={getSigner}
          onReady={(session) => {
            console.log('🚀 ParaPort ready!', session)
          }}
          onSubmit={({ autoteleport, completed }) => {
            console.log('📦 Submit button pressed')
            console.log('💥 Autoteleport: ', autoteleport)
            console.log('✅ Completed: ', completed)
          }}
          onAddFunds={() => {
            console.log('💰 Add funds button pressed')
          }}
          onCompleted={() => {
            console.log('✅ Auto-teleport successfully completed!')
          }}
        />
      </React.StrictMode>
    )
  }
}

main()
