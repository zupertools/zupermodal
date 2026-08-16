import { afterEach, beforeAll } from 'vitest'

/**
 * jsdom (at least the version pinned here) does not implement
 * `HTMLDialogElement.prototype.showModal`/`close`, nor `window.matchMedia`,
 * both of which the whole React adapter is built around. We polyfill the
 * minimum behavior needed to exercise the real component code:
 *
 * - `showModal()` / `close()` toggle the reflected `open` IDL attribute and
 *   fire the same events the real thing does (`close`, and `cancel` when
 *   triggered via Escape — simulated manually in tests by dispatching a
 *   'cancel' event, same as jsdom does support dispatching arbitrary events).
 * - `close(returnValue)` sets `returnValue` before firing `close`.
 * - `window.matchMedia` returns a static, always-non-matching MediaQueryList
 *   (i.e. "prefers-reduced-motion: reduce" is off), which is what the
 *   Provider checks before waiting for a CSS close transition.
 */
beforeAll(() => {
  const proto = window.HTMLDialogElement.prototype

  if (!('showModal' in proto) || typeof proto.showModal !== 'function') {
    Object.defineProperty(proto, 'returnValue', {
      configurable: true,
      writable: true,
      value: '',
    })

    Object.defineProperty(proto, 'showModal', {
      configurable: true,
      writable: true,
      value: function showModal(this: HTMLDialogElement) {
        this.setAttribute('open', '')
      },
    })

    Object.defineProperty(proto, 'close', {
      configurable: true,
      writable: true,
      value: function close(this: HTMLDialogElement, returnValue?: string) {
        if (!this.open) return
        if (returnValue !== undefined) this.returnValue = returnValue
        this.removeAttribute('open')
        this.dispatchEvent(new Event('close'))
      },
    })
  }

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
})

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})
