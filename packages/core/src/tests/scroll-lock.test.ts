import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { lockScroll, unlockScroll } from '../scroll-lock'

// scroll-lock.ts keeps its lock count as module-level state, so every test
// must leave it balanced (equal locks/unlocks) to avoid bleeding into others.
describe('lockScroll / unlockScroll', () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      configurable: true,
    })
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 0,
      configurable: true,
    })
  })

  function setScrollbarWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      configurable: true,
    })
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1024 - width,
      configurable: true,
    })
  }

  it('sets body overflow to hidden', () => {
    setScrollbarWidth(0)
    lockScroll()

    expect(document.body.style.overflow).toBe('hidden')

    unlockScroll()
  })

  it('restores the original overflow value on unlock', () => {
    setScrollbarWidth(0)
    document.body.style.overflow = 'scroll'

    lockScroll()
    expect(document.body.style.overflow).toBe('hidden')

    unlockScroll()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('adds padding-right equal to the scrollbar width when one is present', () => {
    setScrollbarWidth(15)
    document.body.style.paddingRight = '0px'

    lockScroll()

    expect(document.body.style.paddingRight).toBe('15px')

    unlockScroll()
  })

  it('adds scrollbar width on top of any existing padding-right', () => {
    setScrollbarWidth(15)
    document.body.style.paddingRight = '10px'

    lockScroll()

    expect(document.body.style.paddingRight).toBe('25px')

    unlockScroll()
  })

  it('does not touch padding-right when there is no scrollbar', () => {
    setScrollbarWidth(0)
    document.body.style.paddingRight = '5px'

    lockScroll()

    expect(document.body.style.paddingRight).toBe('5px')

    unlockScroll()
  })

  it('restores the original padding-right value on unlock', () => {
    setScrollbarWidth(15)
    document.body.style.paddingRight = '10px'

    lockScroll()
    unlockScroll()

    expect(document.body.style.paddingRight).toBe('10px')
  })

  it('is ref-counted: a second lock does not change already-applied styles', () => {
    setScrollbarWidth(15)
    document.body.style.paddingRight = '10px'

    lockScroll()
    expect(document.body.style.paddingRight).toBe('25px')

    // A second lock while already locked must not stack the padding again.
    lockScroll()
    expect(document.body.style.paddingRight).toBe('25px')

    unlockScroll()
    unlockScroll()
  })

  it('is ref-counted: only unlocks after matching number of unlocks', () => {
    setScrollbarWidth(0)

    lockScroll()
    lockScroll()

    unlockScroll()
    expect(document.body.style.overflow).toBe('hidden')

    unlockScroll()
    expect(document.body.style.overflow).toBe('')
  })

  it('does not go negative when unlocked more times than locked', () => {
    setScrollbarWidth(0)

    expect(() => {
      unlockScroll()
      unlockScroll()
    }).not.toThrow()

    // Should still be able to lock/unlock normally afterward.
    lockScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlockScroll()
    expect(document.body.style.overflow).toBe('')
  })

  it('is a no-op when document is undefined', () => {
    const originalDocument = globalThis.document
    // @ts-expect-error simulating an SSR environment without a DOM
    delete globalThis.document

    try {
      expect(() => {
        lockScroll()
        unlockScroll()
      }).not.toThrow()
    } finally {
      globalThis.document = originalDocument
    }
  })
})
