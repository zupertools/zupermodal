// Ref-counted so that closing one modal in a stack of two doesn't
// re-enable body scroll while another modal is still open.
let lockCount = 0
let originalOverflow = ''
let originalPaddingRight = ''

export function lockScroll(): void {
  if (typeof document === 'undefined') return

  lockCount += 1
  if (lockCount > 1) return

  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth
  originalOverflow = document.body.style.overflow
  originalPaddingRight = document.body.style.paddingRight

  document.body.style.overflow = 'hidden'

  if (scrollbarWidth > 0) {
    const currentPadding =
      Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0
    document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
  }
}

export function unlockScroll(): void {
  if (typeof document === 'undefined') return

  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return

  document.body.style.overflow = originalOverflow
  document.body.style.paddingRight = originalPaddingRight
}
