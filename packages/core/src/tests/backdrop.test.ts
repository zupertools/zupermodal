import { describe, expect, it } from 'vitest'
import { isBackdropClick } from '../backdrop'

describe('isBackdropClick', () => {
  it('returns true when the event target is the dialog node itself', () => {
    const dialog = document.createElement('dialog')
    expect(isBackdropClick({ target: dialog }, dialog)).toBe(true)
  })

  it('returns false when the event target is a descendant of the dialog', () => {
    const dialog = document.createElement('dialog')
    const content = document.createElement('div')
    dialog.appendChild(content)

    expect(isBackdropClick({ target: content }, dialog)).toBe(false)
  })

  it('returns false when the event target is null', () => {
    const dialog = document.createElement('dialog')
    expect(isBackdropClick({ target: null }, dialog)).toBe(false)
  })

  it('returns false when the event target is an unrelated element', () => {
    const dialog = document.createElement('dialog')
    const unrelated = document.createElement('button')

    expect(isBackdropClick({ target: unrelated }, dialog)).toBe(false)
  })

  it('returns false when comparing against a different dialog node with the same tag', () => {
    const dialogA = document.createElement('dialog')
    const dialogB = document.createElement('dialog')

    expect(isBackdropClick({ target: dialogB }, dialogA)).toBe(false)
  })
})
