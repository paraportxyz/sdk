import { afterEach, vi } from 'vitest'

// Stable UUID for deterministic DOM id
vi.stubGlobal('crypto', {
  randomUUID: () => '00000000-0000-0000-0000-000000000000',
})

// Tell React that we're in an act-enabled test environment
// This suppresses noisy warnings when not using RTL
// https://react.dev/reference/react/act
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// Silence console noise in tests
vi.spyOn(console, 'debug').mockImplementation(() => {})
vi.spyOn(console, 'info').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

afterEach(() => {
  vi.clearAllMocks()
})
