# @paraport/sdk

UI layer for seamless integration of ParaPort cross-chain teleportation functionality.

## Installation

```bash
pnpm add @paraport/sdk polkadot-api
```

### Install Peer Dependencies

ParaPort SDK requires `polkadot-api` in your application. Install it as a peer dependency:

```bash
# Required peer dependency
pnpm add polkadot-api
```

## Build

- Prerequisites: build `@paraport/static`, `@paraport/core`, and `@paraport/vue` first
- From repo root:
  - `pnpm --filter @paraport/static build`
  - `pnpm --filter @paraport/core build`
  - `pnpm --filter @paraport/vue build`
  - `pnpm --filter @paraport/sdk build`

Topological order across packages:
- `@paraport/static` → `@paraport/core` → `@paraport/vue` → `@paraport/sdk` → `@paraport/react`

See TESTING.md for end-to-end build and test flow.

## Component Usage

### Basic Integration

```typescript
import '@paraport/sdk/style'
import * as paraport from '@paraport/sdk'
import { connectInjectedExtension } from 'polkadot-api/pjs-signer'

const main = async () => {
  // Required signer (polkadot-api compatible)
  const getSigner = async () => {
    const ext = await connectInjectedExtension('talisman', 'Your App')
    const account = ext.getAccounts()[0]
    return account.polkadotSigner
  }

  paraport.init({
    integratedTargetId: 'root',
    address: USER_ADDRESS,
    amount: '10000000000', // 1 DOT
    chain: 'AssetHubPolkadot',
    asset: 'DOT',
    getSigner,
    label: 'Mint',
    logLevel: 'DEBUG',
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
```

### With custom endpoints (optional)

```ts
import '@paraport/sdk/style'
import * as paraport from '@paraport/sdk'
paraport.init({
  integratedTargetId: 'root',
  address: USER_ADDRESS,
  amount: '10000000000',
  chain: 'AssetHubPolkadot',
  asset: 'DOT',
  endpoints: {
    AssetHubPolkadot: ['wss://statemint.api.onfinality.io/public-ws'],
    Polkadot: ['wss://polkadot-rpc.publicnode.com']
  },
})
```

## Theming

You can customize the UI via CSS variables or per instance:

- Global: override tokens under `.paraport` in your app stylesheet using cascade layers.
- Per instance: pass `appearance` (map of CSS variables) and `themeMode` to `init`.

```ts
paraport.init({
  integratedTargetId: 'root',
  // ...required params
  appearance: { '--radius': '12px', '--accent-blue': '#4f46e5' },
  themeMode: 'auto', // 'light' | 'dark' | 'auto'
})
```

## Props Documentation

### MountOptions

| Property | Type | Description |
|----------|------|-------------|
| integratedTargetId | string | DOM element ID for component mounting |
| address | string | User's address |
| amount | string | Amount to be teleported |
| chain | string | Chain to be teleported to |
| chains | string[] | Optional list of allowed chains to scope routing/UX |
| asset | string | Asset to be teleported |
| endpoints | Record<string, string[]> | Optional RPC endpoints per chain to override defaults |
| getSigner | () => Promise<PolkadotSigner> | Required function returning a polkadot-api signer |
| label | string | Button display text |
| logLevel | string | Log level for debugging (e.g., 'DEBUG') |
| onSubmit | Function | Callback on form submission with { autoteleport, completed } parameters |
| onCompleted | Function | Callback on successful teleport |
| onReady | Function | Callback when UI is ready for interaction |
| onAddFunds | Function | Callback when user clicks to add funds |


## License

MIT
