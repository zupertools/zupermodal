import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ZuperModalProvider } from '../provider'
import { createBox, TestModal, type ModalApi } from './test-helpers'

function flush() {
  return act(async () => {
    await Promise.resolve()
  })
}

async function settle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('ZuperModalProvider', () => {
  it('renders children', async () => {
    render(
      <ZuperModalProvider>
        <div data-testid="child">hello</div>
      </ZuperModalProvider>,
    )
    await flush()
    expect(screen.getByTestId('child')).toBeTruthy()
  })

  it('calls showModal() (reflected via the open property) when a modal opens', async () => {
    const apiBox = createBox<ModalApi<void, void> | null>(null)
    const argsBox = createBox<unknown>(null)

    render(
      <ZuperModalProvider>
        <TestModal config={{}} apiBox={apiBox} argsBox={argsBox} />
      </ZuperModalProvider>,
    )
    await flush()

    const dialog = screen.getByTestId('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(false)

    await act(async () => {
      apiBox.current!.openModal()
    })
    expect(dialog.open).toBe(true)
  })

  describe('backdrop click', () => {
    it('closes when closeOnBackdropClick is true and the click target is the dialog itself', async () => {
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ closeOnBackdropClick: true }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      await act(async () => {
        dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

      expect(dialog.open).toBe(false)
    })

    it('does not close when the click target is content inside the dialog', async () => {
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ closeOnBackdropClick: true }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      const content = screen.getByTestId('content')

      await act(async () => {
        content.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

      expect(dialog.open).toBe(true)
    })

    it('does not close when closeOnBackdropClick is not set (default off)', async () => {
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

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      await act(async () => {
        dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

      expect(dialog.open).toBe(true)
    })

    it('does not close when closeOnBackdropClick is explicitly false', async () => {
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ closeOnBackdropClick: false }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      await act(async () => {
        dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

      expect(dialog.open).toBe(true)
    })
  })

  describe('Esc / cancel', () => {
    it('closes on cancel by default (closeOnEsc unset)', async () => {
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

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      await act(async () => {
        dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
      })

      expect(dialog.open).toBe(false)
    })

    it('closes on cancel when closeOnEsc is explicitly true', async () => {
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ closeOnEsc: true }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      await act(async () => {
        dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
      })

      expect(dialog.open).toBe(false)
    })

    it('does not close on cancel when closeOnEsc is false', async () => {
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ closeOnEsc: false }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      await act(async () => {
        dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
      })

      expect(dialog.open).toBe(true)
    })

    it('always calls preventDefault on the cancel event, even when closeOnEsc is false', async () => {
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ closeOnEsc: false }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      const event = new Event('cancel', { cancelable: true })
      await act(async () => {
        dialog.dispatchEvent(event)
      })

      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('onBeforeClose guard', () => {
    it('blocks closeModal() when it resolves false', async () => {
      const onBeforeClose = vi.fn().mockResolvedValue(false)
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ onBeforeClose }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement

      await act(async () => {
        apiBox.current!.closeModal()
      })
      await settle()

      expect(onBeforeClose).toHaveBeenCalledTimes(1)
      expect(dialog.open).toBe(true)
    })

    it('allows closeModal() to proceed when it resolves true', async () => {
      const onBeforeClose = vi.fn().mockResolvedValue(true)
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ onBeforeClose }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement

      await act(async () => {
        apiBox.current!.closeModal()
      })
      await settle()

      expect(dialog.open).toBe(false)
    })

    it('blocks closing via backdrop click too', async () => {
      const onBeforeClose = vi.fn().mockResolvedValue(false)
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ closeOnBackdropClick: true, onBeforeClose }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      await act(async () => {
        dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      await settle()

      expect(dialog.open).toBe(true)
    })

    it('blocks closing via Esc/cancel too', async () => {
      const onBeforeClose = vi.fn().mockResolvedValue(false)
      const apiBox = createBox<ModalApi<void, void> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ onBeforeClose }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      await act(async () => {
        dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
      })
      await settle()

      expect(dialog.open).toBe(true)
    })
  })

  describe('method="dialog" form submission', () => {
    it('routes the submitter value through the close pipeline instead of native instant close', async () => {
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

      const submitBtn = screen.getByTestId('submit-btn') as HTMLButtonElement
      await act(async () => {
        submitBtn.click()
      })

      await expect(resultPromise).resolves.toBe('submitted-value')
    })

    it('is blocked by onBeforeClose just like any other close path', async () => {
      const onBeforeClose = vi.fn().mockResolvedValue(false)
      const apiBox = createBox<ModalApi<void, string> | null>(null)
      const argsBox = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ onBeforeClose }}
            apiBox={apiBox}
            argsBox={argsBox}
          />
        </ZuperModalProvider>,
      )
      await flush()
      await act(async () => {
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement
      const submitBtn = screen.getByTestId('submit-btn') as HTMLButtonElement

      await act(async () => {
        submitBtn.click()
      })
      await settle()

      expect(dialog.open).toBe(true)
      expect(onBeforeClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('closeTransition', () => {
    it('keeps the dialog open with data-closing set until transitionend fires', async () => {
      const apiBox = createBox<ModalApi<void, void> | null>(null)
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
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement

      act(() => {
        apiBox.current!.closeModal()
      })
      await settle()

      expect(dialog.open).toBe(true)
      expect(dialog.getAttribute('data-closing')).toBe('')

      await act(async () => {
        dialog.dispatchEvent(new Event('transitionend'))
        await Promise.resolve()
      })

      expect(dialog.open).toBe(false)
      expect(dialog.hasAttribute('data-closing')).toBe(false)
    })

    it('closes instantly without waiting when prefers-reduced-motion is enabled', async () => {
      const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
          ({
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          }) as MediaQueryList,
      )

      const apiBox = createBox<ModalApi<void, void> | null>(null)
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
        apiBox.current!.openModal()
      })

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement

      await act(async () => {
        apiBox.current!.closeModal()
      })
      await settle()

      expect(dialog.open).toBe(false)

      matchMediaSpy.mockRestore()
    })

    it('closes instantly (no data-closing wait) when closeTransition is not set', async () => {
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

      const dialog = screen.getByTestId('dialog') as HTMLDialogElement

      await act(async () => {
        apiBox.current!.closeModal()
      })

      expect(dialog.open).toBe(false)
    })
  })

  describe('multiple modals stacking', () => {
    it('supports two independently-controlled modals open at once', async () => {
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
      await act(async () => {
        apiBoxB.current!.openModal()
      })

      const dialogs = screen.getAllByTestId('dialog') as HTMLDialogElement[]
      expect(dialogs).toHaveLength(2)
      expect(dialogs.every((d) => d.open)).toBe(true)

      await act(async () => {
        apiBoxA.current!.closeModal()
      })

      expect(apiBoxA.current!.isOpen).toBe(false)
      expect(apiBoxB.current!.isOpen).toBe(true)
    })

    it("a backdrop click on one dialog doesn't close a different stacked dialog", async () => {
      const apiBoxA = createBox<ModalApi<void, void> | null>(null)
      const argsBoxA = createBox<unknown>(null)
      const apiBoxB = createBox<ModalApi<void, void> | null>(null)
      const argsBoxB = createBox<unknown>(null)

      render(
        <ZuperModalProvider>
          <TestModal
            config={{ closeOnBackdropClick: true }}
            apiBox={apiBoxA}
            argsBox={argsBoxA}
          />
          <TestModal
            config={{ closeOnBackdropClick: true }}
            apiBox={apiBoxB}
            argsBox={argsBoxB}
          />
        </ZuperModalProvider>,
      )
      await flush()

      await act(async () => {
        apiBoxA.current!.openModal()
      })
      await act(async () => {
        apiBoxB.current!.openModal()
      })

      const dialogs = screen.getAllByTestId('dialog') as HTMLDialogElement[]
      await act(async () => {
        dialogs[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

      expect(dialogs[0].open).toBe(false)
      expect(dialogs[1].open).toBe(true)
    })
  })
})
