import { afterEach, vi } from 'vitest'

// Silence console noise in tests
vi.spyOn(console, 'debug').mockImplementation(() => {})
vi.spyOn(console, 'info').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

afterEach(() => {
  vi.clearAllMocks()
})

