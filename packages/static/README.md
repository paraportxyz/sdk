# @paraport/static

Static configuration and constants for ParaPort SDK

## Installation

```bash
# npm
npm install @paraport/static

# yarn
yarn add @paraport/static

# pnpm
pnpm install @paraport/static
```

## Usage

```js
// ESM
import * as static from "@paraport/static";

// CommonJS
const static = require("@paraport/static");
```

## Configuration Files

### 🔧 Chains
Static chain files including decimals, symbol, and ss58 formats
```js
import { CHAINS } from "@paraport/static";
```

### 🔧 providers
Map of RPC providers for each chain
```js
import { provider_MAP } from "@paraport/static";
```

### 🔧 Names
Chain name mappings for frontend display
```js
import { CHAIN_NAMES } from "@paraport/static";
```

### 🔧 Types
Miscellaneous type definitions
```js
import { TYPES } from "@paraport/static";
```

## Developer Notes

### Provider Generation

The RPC providers are pre-generated to avoid external dependencies in the published package. The provider generator is automatically set up during package installation via the postinstall script in the root package.json, and the providers are automatically generated during the prebuild process.

#### Automatic Process

The providers are generated automatically when building the package via the prebuild script

#### Manual Process (if needed)

If you need to manually update the providers:

1. Run the provider generation script:
```bash
cd scripts/generate-providers
pnpm run generate
```

3. Build the package:
```bash
cd packages/static
pnpm build
```

## License

MIT

## Build

- Build this package first so other packages can consume generated providers and dist outputs
- From repo root: `pnpm --filter @paraport/static build`
- Watch mode: `pnpm --filter @paraport/static dev`

Topological order across packages:
- `@paraport/static` → `@paraport/core` → `@paraport/vue` → `@paraport/sdk` → `@paraport/react`

See TESTING.md for end-to-end build and test flow.
