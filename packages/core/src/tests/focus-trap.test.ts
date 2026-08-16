import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { trapFocus } from '../focus-trap'

/**
 * jsdom does not implement layout, so `offsetParent` is always `null` no
 * matter what — even for elements attached to a visible document. The real
 * implementation relies on `offsetParent !== null` to filter out elements
 * hidden via `display: none` (directly or via an ancestor), so we patch in a
 * best-effort polyfill for the duration of this suite that walks up the tree
 * looking for `display: none`.
 */
beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      const isHidden = (el: HTMLElement): boolean => {
        if (el.style.display === 'none') return true
        return el.parentElement ? isHidden(el.parentElement) : false
      }
      return isHidden(this) ? null : (this.parentElement ?? document.body)
    },
  })
})

afterEach(() => {
  document.body.innerHTML = ''
})

function setupDialog(innerHtml: string): HTMLElement {
  const dialog = document.createElement('div')
  dialog.innerHTML = innerHtml
  document.body.appendChild(dialog)
  return dialog
}

describe('trapFocus', () => {
  it('focuses the first focusable element when focus is outside the node', () => {
    const dialog = setupDialog(`
      <button id="first">First</button>
      <button id="second">Second</button>
    `)

    trapFocus(dialog)

    expect(document.activeElement?.id).toBe('first')
  })

  it('does not move focus if it is already inside the node', () => {
    const dialog = setupDialog(`
      <button id="first">First</button>
      <button id="second">Second</button>
    `)
    const second = dialog.querySelector<HTMLButtonElement>('#second')!
    second.focus()

    trapFocus(dialog)

    expect(document.activeElement?.id).toBe('second')
  })

  it('focuses the node itself when there are no focusable descendants', () => {
    // Only programmatically focusable if it has a tabindex; that's the
    // caller's responsibility (per the module's own doc comment), so the
    // dialog container is set up the way real usage would set it up.
    const dialog = setupDialog('<p>No interactive content</p>')
    dialog.tabIndex = -1

    trapFocus(dialog)

    expect(document.activeElement).toBe(dialog)
  })

  it('wraps Tab from the last element back to the first', () => {
    const dialog = setupDialog(`
      <button id="first">First</button>
      <button id="second">Second</button>
    `)
    trapFocus(dialog)

    const last = dialog.querySelector<HTMLButtonElement>('#second')!
    last.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    dialog.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('first')
  })

  it('wraps Shift+Tab from the first element back to the last', () => {
    const dialog = setupDialog(`
      <button id="first">First</button>
      <button id="second">Second</button>
    `)
    trapFocus(dialog)

    const first = dialog.querySelector<HTMLButtonElement>('#first')!
    first.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    dialog.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('second')
  })

  it('does not intercept Tab when focus is on a middle element', () => {
    const dialog = setupDialog(`
      <button id="first">First</button>
      <button id="middle">Middle</button>
      <button id="last">Last</button>
    `)
    trapFocus(dialog)

    const middle = dialog.querySelector<HTMLButtonElement>('#middle')!
    middle.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    dialog.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    // Browser default tab behavior would move focus; jsdom doesn't simulate
    // that, so we only assert the handler chose not to intervene.
  })

  it('ignores non-Tab keydown events', () => {
    const dialog = setupDialog(`<button id="first">First</button>`)
    trapFocus(dialog)

    const first = dialog.querySelector<HTMLButtonElement>('#first')!
    first.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    dialog.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('prevents Tab entirely when there are no focusable elements', () => {
    const dialog = setupDialog('<p>No interactive content</p>')
    trapFocus(dialog)

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    dialog.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('excludes disabled buttons, inputs, textareas, and selects from the focusable set', () => {
    const dialog = setupDialog(`
      <button id="enabled">Enabled</button>
      <button id="disabled-btn" disabled>Disabled</button>
      <input id="disabled-input" disabled />
    `)
    trapFocus(dialog)

    const enabled = dialog.querySelector<HTMLButtonElement>('#enabled')!
    enabled.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    dialog.dispatchEvent(event)

    // Only one focusable element exists, so Tab should wrap back to itself.
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('enabled')
  })

  it('excludes elements with tabindex="-1"', () => {
    const dialog = setupDialog(`
      <div id="not-focusable" tabindex="-1">Not focusable</div>
      <button id="only">Only</button>
    `)
    trapFocus(dialog)

    expect(document.activeElement?.id).toBe('only')
  })

  it('includes elements with a non-negative tabindex', () => {
    const dialog = setupDialog(`
      <div id="focusable" tabindex="0">Focusable div</div>
    `)
    trapFocus(dialog)

    expect(document.activeElement?.id).toBe('focusable')
  })

  it('excludes elements hidden via display:none', () => {
    const dialog = setupDialog(`
      <button id="hidden" style="display:none">Hidden</button>
      <button id="visible">Visible</button>
    `)
    trapFocus(dialog)

    expect(document.activeElement?.id).toBe('visible')
  })

  it('returns a cleanup function that removes the keydown listener', () => {
    const dialog = setupDialog(`
      <button id="first">First</button>
      <button id="second">Second</button>
    `)
    const cleanup = trapFocus(dialog)

    const first = dialog.querySelector<HTMLButtonElement>('#first')!
    first.focus()

    cleanup()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    dialog.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('recomputes the focusable set on every Tab press (handles dynamic content)', () => {
    const dialog = setupDialog(`
      <button id="first">First</button>
      <button id="second">Second</button>
    `)
    trapFocus(dialog)

    // Add a third focusable element after the trap was set up.
    const third = document.createElement('button')
    third.id = 'third'
    dialog.appendChild(third)

    const second = dialog.querySelector<HTMLButtonElement>('#second')!
    second.focus()

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    dialog.dispatchEvent(event)

    // "second" is no longer last, so default Tab behavior should apply.
    expect(event.defaultPrevented).toBe(false)
  })
})
