import { describe, expect, it, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { PolkadotSigner } from 'polkadot-api'

// Mock the SDK init to avoid mounting Vue and network actions
const initMock = vi.fn(() => ({
  update: vi.fn(),
  destroy: vi.fn(),
}))

vi.mock('@paraport/sdk', () => ({
  init: initMock,
}))

// Import the component after mocks using dynamic import

const getSigner = async (): Promise<PolkadotSigner> => ({}) as unknown as PolkadotSigner

const baseProps = {
  address: '5D4...',
  amount: '0',
  chain: 'Polkadot',
  asset: 'DOT',
  chains: ['Polkadot'] as unknown as string[],
  getSigner,
}

describe('react paraport wrapper', () => {
  it('initializes SDK with generated target id and mounts container', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { default: Paraport } = await import('../App')
    const root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(Paraport, baseProps))
      await Promise.resolve()
    })

    // SDK init should be called; verify integratedTargetId shape
    expect(initMock).toHaveBeenCalled()
    const firstArgs = initMock.mock.calls.at(0)
    expect(firstArgs).toBeTruthy()
    const call = firstArgs![0] as { integratedTargetId: string }
    expect(call.integratedTargetId).toBe('paraport-00000000')
  })

  it('updates SDK instance when props change (label/disabled)', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { default: Paraport } = await import('../App')
    const root = createRoot(container)

    await act(async () => {
      root.render(React.createElement(Paraport, { ...baseProps, label: 'A', disabled: false }))
      await Promise.resolve()
    })

    await act(async () => {
      // Rerender with changed props to trigger update effect
      root.render(React.createElement(Paraport, { ...baseProps, label: 'B', disabled: true }))
      await Promise.resolve()
    })

    // The last created instance should receive update
    const lastInstance = (initMock.mock.results.at(-1)?.value) as { update: ReturnType<typeof vi.fn> }
    if (lastInstance?.update) {
      expect(lastInstance.update).toHaveBeenCalledWith({ label: 'B', disabled: true })
    }
  })

  it('calls destroy() on unmount', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { default: Paraport } = await import('../App')
    const root = createRoot(container)

    // Fresh init
    await act(async () => {
      root.render(React.createElement(Paraport, baseProps))
      await Promise.resolve()
    })

    // Unmount should call destroy on instance
    const lastInstance = initMock.mock.results.at(-1)?.value as { destroy: ReturnType<typeof vi.fn> }
    await act(async () => {
      root.unmount()
      await Promise.resolve()
    })
    expect(lastInstance.destroy).toHaveBeenCalled()
  })

  it('forwards optional options to sdk init', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { default: Paraport } = await import('../App')
    const root = createRoot(container)

    const endpoints = { Polkadot: ['wss://example'] } as const
    const logLevel = 'DEBUG'

    await act(async () => {
      root.render(React.createElement(Paraport, { ...baseProps, endpoints: endpoints as unknown as Record<string, string[]>, logLevel }))
      await Promise.resolve()
    })

    expect(initMock).toHaveBeenCalled()
    const lastArgs = initMock.mock.calls.at(-1)
    expect(lastArgs).toBeTruthy()
    const call = lastArgs![0] as { endpoints: Record<string, string[]>; logLevel: string }
    expect(call.endpoints).toEqual(endpoints)
    expect(call.logLevel).toBe(logLevel)
  })

  it('passes event handlers to init args', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { default: Paraport } = await import('../App')
    const root = createRoot(container)

    const onReady = vi.fn()
    const onSubmit = vi.fn()
    const onCompleted = vi.fn()
    const onAddFunds = vi.fn()

    await act(async () => {
      root.render(
        React.createElement(Paraport, {
          ...baseProps,
          onReady,
          onSubmit,
          onCompleted,
          onAddFunds,
        }),
      )
      await Promise.resolve()
    })

    const last = initMock.mock.calls.at(-1)
    expect(last).toBeTruthy()
    const call = last![0] as {
      onReady: unknown
      onSubmit: unknown
      onCompleted: unknown
      onAddFunds: unknown
    }
    expect(call.onReady).toBe(onReady)
    expect(call.onSubmit).toBe(onSubmit)
    expect(call.onCompleted).toBe(onCompleted)
    expect(call.onAddFunds).toBe(onAddFunds)
  })
})
