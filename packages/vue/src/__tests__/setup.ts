import { afterEach, vi } from 'vitest'

// Stable UUID for deterministic behavior if any consumer uses it
vi.stubGlobal('crypto', {
  randomUUID: () => '00000000-0000-0000-0000-000000000000',
})

// Silence console noise in tests
vi.spyOn(console, 'debug').mockImplementation(() => {})
vi.spyOn(console, 'info').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

afterEach(() => {
  vi.clearAllMocks()
})
