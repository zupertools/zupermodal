import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type SubmitEvent,
  type MouseEvent,
  type RefObject,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  createModalStore,
  trapFocus,
  isBackdropClick,
  type ModalInstance,
  type ModalStore,
} from '@zupertools/modal-core'
import { ModalStoreContext } from './context'
import type { BindProps, RenderArgs } from './types'

type CloseFn = (result?: unknown) => void
type CloseRegistry = Map<string, CloseFn>

export const CloseRegistryContext = createContext<CloseRegistry | null>(null)

// A modal is "registered" for as long as its useZuperModal() call site is
// mounted, regardless of open/closed state. This is separate from the
// store's instances array, which only tracks currently open modals, for
// stacking/scroll-lock purposes. This lets the Provider keep every
// <dialog> permanently in the DOM, which is the intended native behavior
// of <dialog> elements.
interface Registration {
  renderRef: RefObject<(args: RenderArgs<unknown, unknown>) => ReactNode>
}

interface RegistrationApi {
  registerDefinition: (id: string, registration: Registration) => void
  unregisterDefinition: (id: string) => void
}

const RegistrationContext = createContext<RegistrationApi | null>(null)

export function useRegistrationContext(): RegistrationApi {
  const ctx = useContext(RegistrationContext)
  if (!ctx) {
    throw new Error(
      '[zupermodal] No ModalStore found. Wrap your app in <ZuperModalProvider>.',
    )
  }
  return ctx
}

export function ZuperModalProvider({ children }: { children?: ReactNode }) {
  const store = useMemo(() => createModalStore(), [])
  const instances = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )
  const closeRegistry = useRef<CloseRegistry>(new Map()).current

  const [registrations, setRegistrations] = useState<Map<string, Registration>>(
    new Map(),
  )

  const registerDefinition = useCallback(
    (id: string, registration: Registration) => {
      setRegistrations((prev) => new Map(prev).set(id, registration))
    },
    [],
  )

  const unregisterDefinition = useCallback((id: string) => {
    setRegistrations((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const registrationApi = useMemo(
    () => ({ registerDefinition, unregisterDefinition }),
    [registerDefinition, unregisterDefinition],
  )

  return (
    <ModalStoreContext.Provider value={store}>
      <RegistrationContext.Provider value={registrationApi}>
        <CloseRegistryContext.Provider value={closeRegistry}>
          {children}
          {typeof document !== 'undefined' &&
            createPortal(
              <>
                {[...registrations.entries()].map(([id, registration]) => (
                  <ModalRenderer
                    key={id}
                    id={id}
                    registration={registration}
                    instance={instances.find((i) => i.id === id)}
                    store={store}
                    closeRegistry={closeRegistry}
                  />
                ))}
              </>,
              document.body,
            )}
        </CloseRegistryContext.Provider>
      </RegistrationContext.Provider>
    </ModalStoreContext.Provider>
  )
}

function ModalRenderer({
  id,
  registration,
  instance,
  store,
  closeRegistry,
}: {
  id: string
  registration: Registration
  instance: ModalInstance | undefined
  store: ModalStore
  closeRegistry: CloseRegistry
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  async function requestNativeClose(result?: unknown) {
    const allowed = await store.requestClose(id, result)
    if (!allowed) return

    const node = dialogRef.current
    if (!node) return

    if (!instance?.config.closeTransition) {
      node.close()
      return
    }

    // Delay actual close to allow for animations in browsers that do not
    // support CSS's 'overlay' property. Close immediately if reduced
    // motion is enabled, to avoid a delay with no animation.
    const isReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (isReduced) {
      node.close()
      return
    }

    node.setAttribute('data-closing', '')

    await new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        node.removeEventListener('transitionend', finish)
        resolve()
      }
      node.addEventListener('transitionend', finish, { once: true })
    })

    node.removeAttribute('data-closing')
    node.close()
  }

  // Keep the latest closure so the registry can expose a stable function
  // without capturing a stale requestNativeClose from the initial render.
  const requestNativeCloseRef = useRef(requestNativeClose)
  requestNativeCloseRef.current = requestNativeClose

  useEffect(() => {
    const stableClose: CloseFn = (result) =>
      requestNativeCloseRef.current(result)

    closeRegistry.set(id, stableClose)
    return () => void closeRegistry.delete(id)
  }, [id, closeRegistry])

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (instance) {
      if (!node.open) node.showModal()
      return trapFocus(node)
    }
    node.close()
  }, [instance])

  function handleClose() {
    // The single point where every close resolves the open() promise.
    store.finalizeClose(id)
  }

  function handleCancel(e: SyntheticEvent) {
    e.preventDefault()
    if (instance?.config.closeOnEsc === false) return
    void requestNativeClose(undefined)
  }

  function handleBackdropClick(e: MouseEvent) {
    if (!instance?.config.closeOnBackdropClick) return
    if (isBackdropClick(e, dialogRef.current!))
      void requestNativeClose(undefined)
  }

  function handleSubmit(e: SubmitEvent<HTMLDialogElement>) {
    const form = e.target as HTMLFormElement
    if (form.method !== 'dialog') return

    // Intercept method="dialog" form submissions
    e.preventDefault()
    const submitter = e.nativeEvent.submitter as
      | HTMLButtonElement
      | HTMLInputElement
      | null
    void requestNativeClose(submitter?.value)
  }

  const bind = (): BindProps => ({
    ref: dialogRef,
    onClose: handleClose,
    onCancel: handleCancel,
    onClick: handleBackdropClick,
    onSubmit: handleSubmit,
  })

  const args: RenderArgs<unknown, unknown> = {
    isOpen: !!instance,
    data: instance?.data,
    onClose: (result?: unknown) => void requestNativeClose(result),
    bind,
  }

  return registration.renderRef.current(args)
}
