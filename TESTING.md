# ParaPort Monorepo Testing Guide

This guide explains how to build and test all packages in this monorepo, including required environment variables for live end-to-end tests. It mirrors our CI setup for reliable, repeatable local runs.

Packages:
- @paraport/static — chain metadata/providers (no tests)
- @paraport/core — core logic and session management (unit, integration, live E2E)
- @paraport/vue — Vue 3 component library (unit)
- @paraport/sdk — framework‑agnostic embedded UI (unit)
- @paraport/react — React wrapper (unit)

## Requirements
- Node.js 20.x (LTS)
- pnpm 9.x

Install dependencies at the repo root:

```bash
pnpm install
```

## Build Order

The packages have dependencies and should be built in topological order:
1) @paraport/static → 2) @paraport/core → 3) @paraport/vue → 4) @paraport/sdk → 5) @paraport/react

Recommended options:
- Build everything (topo-ordered by pnpm):
  - `pnpm -r build`
- Or use explicit steps (mirrors CI stages):
  - `pnpm --filter @paraport/static build`
  - `pnpm --filter @paraport/core build`
  - `pnpm --filter @paraport/vue build`
  - `pnpm --filter @paraport/sdk build`
  - `pnpm --filter @paraport/react build`
- Makefile alternative:
  - `make install` then `make build`

## Quick Test Matrix

Run all tests that exist in the workspace:

```bash
pnpm -r --if-present run test
```

Run specific package tests:
- Core: `pnpm --filter @paraport/core test`
- Vue: `pnpm --filter @paraport/vue test`
- SDK: `pnpm --filter @paraport/sdk test`
- React: `pnpm --filter @paraport/react test`

Useful variants (where provided):
- Watch mode (core): `pnpm --filter @paraport/core run test:watch`
- Coverage (core): `pnpm --filter @paraport/core run test:coverage`

## Core Test Types

Core provides three distinct test flows:
- Unit tests: fast, mocked, run with `pnpm --filter @paraport/core test`
- Mocked integration (e2e): isolated end-to-end flow with mocks, run with `pnpm --filter @paraport/core run test:e2e`
- Live E2E tests: exercise the real networks/providers, see below

Before core tests, static must be built at least once:

```bash
pnpm --filter @paraport/static build
```

## Live E2E Tests (@paraport/core)

These tests submit real transactions on test networks. Use only test accounts.

Environment variables:
- `E2E_LIVE` — set to `1` to enable live tests
- `E2E_CHAIN` — destination chain name; recommended default: `CoretimePaseo`
- `E2E_MNEMONIC` — REQUIRED. 12/24‑word mnemonic used to derive the destination address
- `E2E_ADDRESS` — Optional. If provided, overrides the address derived from the mnemonic

Examples:

Run live tests using a mnemonic (recommended):
```bash
pnpm --filter @paraport/static build
E2E_LIVE=1 E2E_CHAIN="CoretimePaseo" E2E_MNEMONIC="word1 word2 ..." pnpm --filter @paraport/core run test:e2e:live
```

Optionally, provide an explicit address to override the derived one:
```bash
pnpm --filter @paraport/static build
E2E_LIVE=1 E2E_CHAIN="CoretimePaseo" E2E_MNEMONIC="word1 word2 ..." E2E_ADDRESS="YOUR_SS58_ADDRESS" pnpm --filter @paraport/core run test:e2e:live
```

Notes:
- Valid chain names come from `@paraport/static`’s `Chains` enum. For quick starts, use `CoretimePaseo` as in our CI.
- Live config swaps to a Node WS provider automatically (see `packages/core/vitest.config.e2e.live.ts`).
- Fund the source and destination account with sufficient test tokens or tests may skip/fail.

## Replicating CI Locally

This sequence mirrors .github/workflows/ci.yml:

```bash
pnpm install

# Lint and typecheck (optional but recommended)
pnpm -w run ci:bootstrap
pnpm --filter @paraport/static run typecheck
pnpm --filter @paraport/core run typecheck
pnpm --filter @paraport/vue run typecheck
pnpm --filter @paraport/sdk run typecheck
pnpm --filter @paraport/react run typecheck

# Tests (unit + mocked e2e)
pnpm --filter @paraport/static build
pnpm --filter @paraport/core test
pnpm --filter @paraport/core run test:e2e

pnpm --filter @paraport/core build
pnpm --filter @paraport/vue test

pnpm --filter @paraport/vue build
pnpm --filter @paraport/sdk test

pnpm --filter @paraport/sdk build
pnpm --filter @paraport/react test
```

To run the scheduled live E2E locally (mirrors core-e2e.yml):
```bash
pnpm --filter @paraport/static build
E2E_LIVE=1 E2E_CHAIN=CoretimePaseo E2E_ADDRESS=YOUR_SS58_ADDRESS pnpm --filter @paraport/core run test:e2e:live
```

## Linting and Typechecking

At the root:
- Lint all: `pnpm lint`
- Bootstrap types for cross‑package checks: `pnpm -w run ci:bootstrap`
- Typecheck per package: `pnpm --filter <pkg> run typecheck`

## Troubleshooting
- “E2E_CHAIN is required…” — set `E2E_CHAIN` to a valid chain name (e.g., `CoretimePaseo`).
- “E2E_ADDRESS or E2E_MNEMONIC is required” — provide `E2E_MNEMONIC`. `E2E_ADDRESS` is optional and only used to override the derived address.
- Live tests hang/fail — ensure the account is funded and your network allows WebSocket connections.
- Build errors about missing workspace deps — run `pnpm -r build` to ensure topo-ordered builds.

## See Also
- CI pipeline: `.github/workflows/ci.yml`
- Core live E2E workflow: `.github/workflows/core-e2e.yml`
- Package READMEs for usage examples
