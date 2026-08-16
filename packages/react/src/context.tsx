import { createContext, useContext } from 'react'
import type { ModalStore } from '@zupertools/modal-core'

export const ModalStoreContext = createContext<ModalStore | null>(null)

export function useModalStoreContext(): ModalStore {
  const store = useContext(ModalStoreContext)
  if (!store) {
    throw new Error(
      '[zupermodal] No ModalStore found. Wrap your app in <ZuperModalProvider>.',
    )
  }
  return store
}
