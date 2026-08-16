const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(node: HTMLElement): HTMLElement[] {
  return Array.from(
    node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) => el.offsetParent !== null, // excludes display:none / hidden ancestors
  )
}

/**
 * Traps Tab focus cycling within 'node'. Call once the node is in
 * the DOM and visible. Returns a cleanup function to release the trap.
 *
 * Does not itself decide *when* to focus. Call `node.focus()` or focus a
 * specific child before/after wiring this up, based on your open state.
 */
export function trapFocus(node: HTMLElement): () => void {
  if (!node.contains(document.activeElement)) {
    const focusable = getFocusable(node)
    ;(focusable[0] ?? node).focus()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return

    const focusable = getFocusable(node)
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  node.addEventListener('keydown', handleKeydown)
  return () => node.removeEventListener('keydown', handleKeydown)
}
