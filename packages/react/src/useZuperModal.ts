import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import type { ModalConfig } from '@zupertools/modal-core'
import { useModalStoreContext } from './context'
import { CloseRegistryContext, useRegistrationContext } from './provider'
import type { RenderArgs } from './types'

export function useZuperModal<TData = void, TResult = void>(
  config: ModalConfig,
  render: (args: RenderArgs<TData, TResult>) => ReactNode,
) {
  const store = useModalStoreContext()
  const { registerDefinition, unregisterDefinition } = useRegistrationContext()
  const closeRegistry = useContext(CloseRegistryContext)

  // Latest render fn without re-registering.
  // Avoids a stale closure without needing a new ID on every render.
  const renderRef = useRef(render)
  renderRef.current = render

  // Stable, generic-erased wrapper so the Provider can call it without
  // knowing TData/TResult, while always delegating to the latest 'render'
  // closure.
  const wrappedRenderRef = useRef((args: RenderArgs<unknown, unknown>) =>
    renderRef.current(args as RenderArgs<TData, TResult>),
  )

  const configRef = useRef(config) // captured at registration time

  // Registration lives entirely inside the effect so register/unregister
  // are a matched pair. Makes it safe under StrictMode's simulated
  // mount -> cleanup -> mount.
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    const newId = store.register(wrappedRenderRef.current, configRef.current)
    registerDefinition(newId, { renderRef: wrappedRenderRef })
    setId(newId)
    return () => {
      unregisterDefinition(newId)
      store.unregister(newId)
    }
  }, [store])

  const instances = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )
  const instance = id ? instances.find((i) => i.id === id) : undefined

  const openModal = useCallback(
    (data: TData) => {
      if (!id) {
        return Promise.reject(
          new Error(
            '[zupermodal] openModal() called before the modal finished registering.',
          ),
        )
      }
      return store.open(id, data) as Promise<TResult>
    },
    [store, id],
  )

  const closeModal = useCallback(
    (result?: TResult) => {
      if (!id) return
      closeRegistry?.get(id)?.(result)
    },
    [closeRegistry, id],
  )

  return { openModal, closeModal, isOpen: !!instance }
}
