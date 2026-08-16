import { createModalStore } from '@zupertools/modal-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModalStoreContext, useModalStoreContext } from '../context'

describe('useModalStoreContext', () => {
  it('throws a descriptive error when used outside a ZuperModalProvider', () => {
    expect(() => renderHook(() => useModalStoreContext())).toThrow(
      '[zupermodal] No ModalStore found. Wrap your app in <ZuperModalProvider>.',
    )
  })

  it('returns the store from context when present', () => {
    const store = createModalStore()
    const { result } = renderHook(() => useModalStoreContext(), {
      wrapper: ({ children }) => (
        <ModalStoreContext.Provider value={store}>
          {children}
        </ModalStoreContext.Provider>
      ),
    })

    expect(result.current).toBe(store)
  })
})
