import { connectInjectedExtension } from 'polkadot-api/pjs-signer'

export const USER_ADDRESS = 'Gn84LKb5HSxc3SACayxCzKQcWESRMcT1VUCqeZURfGj6ASi'
export const AMOUNT = String(250e8)
export const CHAIN = 'AssetHubPolkadot' as const
export const CHAINS = undefined
export const ASSET = 'DOT' as const

export const ENDPOINTS = {
  'AssetHubPolkadot': ["wss://statemint.api.onfinality.io/public-ws","wss://asset-hub-polkadot.dotters.network"],
  'Polkadot': ["wss://polkadot-public-rpc.blockops.network/ws","wss://polkadot-rpc.publicnode.com"],
  "Hydration": ["wss://hydration-rpc.n.dwellir.com","wss://rpc.hydradx.cloud","wss://hydration.dotters.network"]
}

export const getSigner = async () => {
  const inject = await connectInjectedExtension('talisman', 'Chaotic')
  const account = inject.getAccounts().find((account) => account.address === USER_ADDRESS)
  return account!.polkadotSigner
}
