<p align="center">
  <img src=".github/paraport.svg" alt="ParaPort Logo" width="420" />
</p>

<p align="center">
    <strong style="font-size: 1.2em;">Seamless Cross-Chain Experience</strong> <br/>
    One signature. Zero complexity. Multiple chains.
</p>
<br/>

ParaPort enables “auto-teleport” flows in the Polkadot ecosystem — automatically funding the destination and guiding users through cross-chain transfers with a drop‑in UI or framework components.

## Packages

- [@paraport/core](https://github.com/exezbcz/paraport/tree/main/packages/core#readme) — core logic and evented session management for auto‑teleport
- [@paraport/vue](https://github.com/exezbcz/paraport/tree/main/packages/vue/README.md) — Vue 3 component library and plugin
- [@paraport/react](https://github.com/exezbcz/paraport/tree/main/packages/react/README.md) — React component wrapper
- [@paraport/sdk](https://github.com/exezbcz/paraport/tree/main/packages/sdk/README.md) — framework‑agnostic, embeddable UI (ships CSS + init API)
- [@paraport/static](https://github.com/exezbcz/paraport/tree/main/packages/static/README.md) — chain metadata, providers and constants

## Integrations

- React integration: see [@paraport/react](https://github.com/exezbcz/paraport/tree/main/packages/react/README.md#component-usage) usage and props
- Vue 3 integration: see [@paraport/vue](https://github.com/exezbcz/paraport/tree/main/packages/vue/README.md#component-usage) usage and props
- Embedded SDK: see [@paraport/sdk](https://github.com/exezbcz/paraport/tree/main/packages/sdk/README.md#component-usage) usage and options

## Development

```bash
# Install workspace deps
pnpm install

# Build all packages (in correct order)
pnpm build

# Run all package dev builds in watch mode
pnpm dev

# Lint focused packages
pnpm lint
```

Requirements
- Node.js (LTS)
- pnpm 9.1.3+

## Testing

See TESTING.md for a consolidated, step-by-step guide covering build order, commands to run unit/integration tests across packages, and the required environment variables for live E2E tests.

## Funding

Project was funded as a common good by

<div align="center">
  <img width="200" alt="version" src="https://user-images.githubusercontent.com/55763425/211145923-f7ee2a57-3e63-4b7d-9674-2da9db46b2ee.png" />
</div>
