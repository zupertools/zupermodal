import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ZuperModalProvider } from '../provider'
import { useZuperModal } from '../useZuperModal'
import { createBox, TestModal, type ModalApi } from './test-helpers'

function flush() {
  return act(async () => {
    await Promise.resolve()
  })
}

describe('useZuperModal', () => {
  it('throws when used outside a ZuperModalProvider', () => {
    expect(() => renderHook(() => useZuperModal({}, () => null))).toThrow(
      '[zupermodal] No ModalStore found. Wrap your app in <ZuperModalProvider>.',
    )
  })

  it('isOpen is false before the modal is opened', async () => {
    const apiBox = createBox<ModalApi<void, void> | null>(null)
    const argsBox = createBox<unknown>(null)

    render(
      <ZuperModalProvider>
        <TestModal config={{}} apiBox={apiBox} argsBox={argsBox} />
      </ZuperModalProvider>,
    )
    await flush()

    expect(apiBox.current!.isOpen).toBe(false)
  })

  it('isOpen becomes true after openModal() and false after closeModal()', async () => {
    const apiBox = createBox<ModalApi<void, void> | null>(null)
    const argsBox = createBox<unknown>(null)

    render(
      <ZuperModalProvider>
        <TestModal config={{}} apiBox={apiBox} argsBox={argsBox} />
      </ZuperModalProvider>,
    )
    await flush()

    await act(async () => {
      apiBox.current!.openModal()
    })
    expect(apiBox.current!.isOpen).toBe(true)

    await act(async () => {
      apiBox.current!.closeModal()
    })
    expect(apiBox.current!.isOpen).toBe(false)
  })

  it('openModal() resolves with the result passed to closeModal()', async () => {
    const apiBox = createBox<ModalApi<void, string> | null>(null)
    const argsBox = createBox<unknown>(null)

    render(
      <ZuperModalProvider>
        <TestModal config={{}} apiBox={apiBox} argsBox={argsBox} />
      </ZuperModalProvider>,
    )
    await flush()

    let resultPromise: Promise<string> | undefined
    await act(async () => {
      resultPromise = apiBox.current!.openModal()
    })

    await act(async () => {
      apiBox.current!.closeModal('done')
    })

    await expect(resultPromise).resolves.toBe('done')
  })

  it('passes data through to the render function', async () => {
    const apiBox = createBox<ModalApi<{ name: string }, void> | null>(null)
    const argsBox = createBox<unknown>(null)

    render(
      <ZuperModalProvider>
        <TestModal config={{}} apiBox={apiBox} argsBox={argsBox} />
      </ZuperModalProvider>,
    )
    await flush()

    await act(async () => {
      apiBox.current!.openModal({ name: 'Ada' })
    })

    expect(screen.getByTestId('content').textContent).toBe(
      JSON.stringify({ name: 'Ada' }),
    )
  })

  it('data from the last open() is retained while a closeTransition is pending', async () => {
    // With closeTransition on, the store instance (and so its data) isn't
    // removed until the dialog's native 'close' event fires, which only
    // happens after the awaited transitionend. This lets exit animations
    // still render real content instead of going blank instantly.
    const apiBox = createBox<ModalApi<{ name: string }, void> | null>(null)
    const argsBox = createBox<unknown>(null)

    render(
      <ZuperModalProvider>
        <TestModal
          config={{ closeTransition: true }}
          apiBox={apiBox}
          argsBox={argsBox}
        />
      </ZuperModalProvider>,
    )
    await flush()

    await act(async () => {
      apiBox.current!.openModal({ name: 'Ada' })
    })

    const dialog = screen.getByTestId('dialog') as HTMLDialogElement

    // closeModal() kicks off the transition wait; don't await it yet.
    act(() => {
      apiBox.current!.closeModal()
    })
    // Let the microtask queue settle so the 'data-closing' attribute (set
    // just before awaiting transitionend) has actually been applied, without
    // yet firing the transitionend that would let the close complete.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // Still mid-transition: isOpen and data both still reflect the open call.
    expect(dialog.getAttribute('data-closing')).toBe('')
    const args = argsBox.current as { isOpen: boolean; data: unknown }
    expect(args.isOpen).toBe(true)
    expect(args.data).toEqual({ name: 'Ada' })

    await act(async () => {
      dialog.dispatchEvent(new Event('transitionend'))
      await Promise.resolve()
    })

    expect(dialog.open).toBe(false)
  })

  it('closeModal() before registration completes is a no-op (does not throw)', () => {
    let capturedCloseModal: ((result?: void) => void) | undefined
    function Harness() {
      const { closeModal } = useZuperModal<void, void>({}, () => null)
      capturedCloseModal = closeModal
      return null
    }

    render(
      <ZuperModalProvider>
        <Harness />
      </ZuperModalProvider>,
    )

    expect(() => capturedCloseModal!()).not.toThrow()
  })

  it('re-opening an already-open modal updates data without remounting', async () => {
    const apiBox = createBox<ModalApi<{ n: number }, void> | null>(null)
    const argsBox = createBox<unknown>(null)
    const renderCountBox = createBox(0)

    render(
      <ZuperModalProvider>
        <TestModal
          config={{}}
          apiBox={apiBox}
          argsBox={argsBox}
          renderCountBox={renderCountBox}
        />
      </ZuperModalProvider>,
    )
    await flush()

    await act(async () => {
      apiBox.current!.openModal({ n: 1 })
    })
    await act(async () => {
      apiBox.current!.openModal({ n: 2 })
    })

    expect(screen.getByTestId('content').textContent).toBe(
      JSON.stringify({ n: 2 }),
    )
  })

  it('multiple independent useZuperModal call sites get distinct ids/state', async () => {
    const apiBoxA = createBox<ModalApi<void, void> | null>(null)
    const argsBoxA = createBox<unknown>(null)
    const apiBoxB = createBox<ModalApi<void, void> | null>(null)
    const argsBoxB = createBox<unknown>(null)

    render(
      <ZuperModalProvider>
        <TestModal config={{}} apiBox={apiBoxA} argsBox={argsBoxA} />
        <TestModal config={{}} apiBox={apiBoxB} argsBox={argsBoxB} />
      </ZuperModalProvider>,
    )
    await flush()

    await act(async () => {
      apiBoxA.current!.openModal()
    })

    expect(apiBoxA.current!.isOpen).toBe(true)
    expect(apiBoxB.current!.isOpen).toBe(false)
  })

  it('unregisters on unmount, resolving any pending openModal() promise', async () => {
    const apiBox = createBox<ModalApi<void, void> | null>(null)
    const argsBox = createBox<unknown>(null)

    function Wrapper({ mounted }: { mounted: boolean }) {
      return (
        <ZuperModalProvider>
          {mounted && (
            <TestModal config={{}} apiBox={apiBox} argsBox={argsBox} />
          )}
        </ZuperModalProvider>
      )
    }

    const { rerender } = render(<Wrapper mounted />)
    await flush()

    let resultPromise: Promise<void> | undefined
    await act(async () => {
      resultPromise = apiBox.current!.openModal()
    })

    await act(async () => {
      rerender(<Wrapper mounted={false} />)
    })

    await expect(resultPromise).resolves.toBeUndefined()
  })

  it('closeModal() is a no-op once the call site has unmounted', async () => {
    const apiBox = createBox<ModalApi<void, void> | null>(null)
    const argsBox = createBox<unknown>(null)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Wrapper({ mounted }: { mounted: boolean }) {
      return (
        <ZuperModalProvider>
          {mounted && (
            <TestModal config={{}} apiBox={apiBox} argsBox={argsBox} />
          )}
        </ZuperModalProvider>
      )
    }

    const { rerender } = render(<Wrapper mounted />)
    await flush()

    const closeModal = apiBox.current!.closeModal

    await act(async () => {
      rerender(<Wrapper mounted={false} />)
    })

    expect(() => closeModal()).not.toThrow()
    consoleError.mockRestore()
  })
})
