# ParaPort Playground

Local-only sandbox for developing and testing ParaPort packages and examples. This app exists purely for internal/local development and is not intended for production use or publishing.

## Quick Start

- Install dependencies at the repo root: `pnpm install`
- Build workspace packages once (generates dist/ for local links): `pnpm build`
- Run the playground:
  - From repo root: `pnpm --filter @paraport/playground dev`
  - Or inside `apps/playground`: `pnpm dev`

## What’s Inside

- Example UIs in `react/`, `vue/` and `sdk/`
- Vite-based dev server and minimal scaffolding

## utils.ts

Centralized demo configuration and helpers used across the playground examples.

- `USER_ADDRESS`: Placeholder dev address used by examples. Replace with your own address from the connected wallet extension.
- `AMOUNT`: Example transfer amount (string). For DOT, values are in planck (10^10 planck = 1 DOT).
- `CHAIN`: Default chain used in the examples (e.g., `Hydration`).
- `CHAINS`: Optional chain config override. Leave `undefined` to use SDK defaults.
- `ASSET`: Default asset symbol for examples (e.g., `DOT`).
- `ENDPOINTS`: Map of chain name → array of WSS endpoints used by the playground. Add or replace endpoints as needed for your environment.
- `getSigner()`: Connects to the injected extension and returns a signer for `USER_ADDRESS`. Update the extension id or address as needed. The second argument is the dapp name shown in the wallet’s permission prompt.

## Notes

- Uses workspace-linked `@paraport/*` packages for local iteration
- Assumes local/test network settings; not production-hardened
- If you see Vite errors like "Failed to resolve entry for package '@paraport/sdk'" or TS errors like "Cannot find module '@paraport/static'", it means the linked packages haven't been built yet. Run `pnpm build` from the repo root.
