# ParaPort Core

[![npm version](https://img.shields.io/npm/v/@paraport/core.svg)](https://www.npmjs.com/package/@paraport/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The `@paraport/core` package provides the foundational functionality for the ParaPort SDK, enabling seamless cross-chain token movement within the Polkadot/Kusama ecosystem. It serves as the backbone for the automated token movement feature, which automatically handles the process of ensuring users have sufficient funds on destination chains for transactions.

This package can be used directly for programmatic control of cross-chain transfers or as the foundation for UI integrations through the `@paraport/sdk` package.

## Features

- **Cross-Chain Token Movement**: Facilitates asset transfers between different parachains using XCM protocol
- **Session Management**: Handles token movement sessions with various states (Created, Ready, Processing, Completed, Failed)
- **Event System**: Comprehensive event emitters for tracking token movement and session status changes
- **Balance Management**: Utilities for checking and managing balances across chains
- **Transaction Handling**: Robust transaction management with status tracking and error handling
- **Automated Token Movement**: Automatically ensures users have sufficient funds on destination chains for transactions
- **Chain Support**: Works with Polkadot, Kusama, and their respective parachains
- **Quote Selection**: Automatically selects the best available route for asset transfers
- **Fund Status Tracking**: Monitors available funds and determines if additional funds are needed

## Architecture

The core package is structured around several key components:

- **ParaPortSDK**: Main entry point that orchestrates all functionality
- **Managers**: Session, Teleport, and Transaction managers for handling different aspects of the teleport process
- **Bridges**: Adapters for different cross-chain protocols (currently XCM)
- **Services**: Substrate API, Balance, and Fee services for blockchain interactions
- **Types**: Comprehensive type definitions for the entire system

## Usage

### SDK Initialization

```typescript
const sdk = new ParaPortSDK({
  getSigner: () => yourPolkadotSigner, // Required
  logLevel: 'INFO', // Optional
  bridgeProtocols: ['XCM'], // Optional
  chains: customChainConfigurations // Optional
});

await sdk.initialize();
```

### Session Management and Events

```typescript
// Create a teleport session
const session = await sdk.initSession({
  chain: 'AssetHubPolkadot', // Polkadot, Kusama, AssetHubPolkadot, AssetHubKusama, Hydration
  asset: 'DOT',
  amount: '10000000000', // 1 DOT (10^10 planck)
  address: 'yourPolkadotAddress'
});

// Subscribe to session events
sdk.onSession('session:updated', (payload) => {
  console.log('Session state changed:', payload.status);
});

// Subscribe to teleport events
sdk.onTeleport('teleport:completed', (payload) => {
  console.log('Teleport completed with hash:', payload.txHash);
});

// Execute when ready
await sdk.executeSession(session.id);

// Retry Session
sdk.retrySession(session.id)
```

## Event Types

### Session Events
- `session:created`: New token movement session created
- `session:updated`: Session state changes
- `session:deleted`: Session removed
- `session:completed`: Session successfully completed
- `session:failed`: Session failed

### Token Movement Events
- `movement:started`: Token movement transaction begins
- `movement:updated`: Token movement status changes
- `movement:completed`: Token movement successfully completed

## Dependencies

- `@paraport/static`: Static data about chains and assets
- `polkadot-api`: High-performance Substrate/Polkadot API used for network interactions

## Installation

```bash
pnpm add @paraport/core polkadot-api
```

### Install Peer Dependencies

ParaPort Core declares `polkadot-api` as a peer dependency. Install it alongside the package:

```bash
pnpm add polkadot-api
```

## Build

- Prerequisite: build `@paraport/static` first (core depends on it)
- From repo root:
  - `pnpm --filter @paraport/static build`
  - `pnpm --filter @paraport/core build`

Topological order across packages:
- `@paraport/static` → `@paraport/core` → `@paraport/vue` → `@paraport/sdk` → `@paraport/react`

See TESTING.md for end-to-end build and test flow.

## Automated Token Movement Process

The automated token movement feature simplifies cross-chain transfers by:

1. **Checking Balances**: Verifies if the user has sufficient funds on both source and destination chains
2. **Quote Selection**: Automatically selects the best available route for the transfer
3. **Fund Status Determination**: Determines if additional funds are needed on the destination chain
4. **Session Management**: Creates and manages the teleport session through its lifecycle
5. **Transaction Execution**: Handles the actual transfer when the session is ready

## License

MIT
