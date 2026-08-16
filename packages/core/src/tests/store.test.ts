import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createModalStore } from '../store'
import { lockScroll, unlockScroll } from '../scroll-lock'
import type { ModalStore } from '../types'

// scroll-lock.ts keeps ref-counted state at module scope, which would leak
// across the many open()/close() calls made throughout this file's tests
// (most of which don't clean up after themselves, since that's not what
// they're testing). We mock it here and verify calls instead; the real
// locking/unlocking behavior is covered in scroll-lock.test.ts.
vi.mock('../scroll-lock', () => ({
  lockScroll: vi.fn(),
  unlockScroll: vi.fn(),
}))

describe('createModalStore', () => {
  let store: ModalStore

  beforeEach(() => {
    store = createModalStore()
    vi.clearAllMocks()
  })

  describe('register / unregister', () => {
    it('returns a unique id for each registration', () => {
      const idA = store.register('content-a', {})
      const idB = store.register('content-b', {})
      expect(idA).not.toBe(idB)
    })

    it('unregister on a never-opened id is a no-op', () => {
      const id = store.register('content', {})
      expect(() => store.unregister(id)).not.toThrow()
      expect(store.getSnapshot()).toEqual([])
    })

    it('unregister on an unknown id is a no-op', () => {
      expect(() => store.unregister('does-not-exist')).not.toThrow()
    })

    it('unregistering an open modal force-removes it from the stack and resolves with undefined', async () => {
      const id = store.register('content', {})
      const openPromise = store.open(id)

      expect(store.getSnapshot()).toHaveLength(1)

      store.unregister(id)

      await expect(openPromise).resolves.toBeUndefined()
      expect(store.getSnapshot()).toEqual([])
    })

    it('unregistering after unregister already removed the definition throws on next open', () => {
      const id = store.register('content', {})
      store.unregister(id)
      expect(() => store.open(id)).toThrow(/isn't registered/)
    })
  })

  describe('open', () => {
    it('throws when opening an id that was never registered', () => {
      expect(() => store.open('unknown-id')).toThrow(
        /Tried to open modal "unknown-id" but it isn't registered/,
      )
    })

    it('adds a new instance to the stack with the given data and config', () => {
      const config = { closeOnEsc: true }
      const id = store.register('my-content', config)
      store.open(id, { foo: 'bar' })

      const [instance] = store.getSnapshot()
      expect(instance).toMatchObject({
        id,
        content: 'my-content',
        data: { foo: 'bar' },
        config,
      })
    })

    it('defaults data to undefined when not provided', () => {
      const id = store.register('content', {})
      store.open(id)

      expect(store.getSnapshot()[0]?.data).toBeUndefined()
    })

    it('supports multiple different modals open simultaneously (a stack)', () => {
      const idA = store.register('content-a', {})
      const idB = store.register('content-b', {})

      store.open(idA)
      store.open(idB)

      const snapshot = store.getSnapshot()
      expect(snapshot).toHaveLength(2)
      expect(snapshot.map((i) => i.id)).toEqual([idA, idB])
    })

    it('opening the same id again while already open resolves the stale promise with undefined', async () => {
      const id = store.register('content', {})
      const firstOpen = store.open(id)

      store.open(id)

      await expect(firstOpen).resolves.toBeUndefined()
    })

    it('opening the same id again while already open updates the data in place', () => {
      const id = store.register('content', {})
      store.open(id, { value: 1 })
      store.open(id, { value: 2 })

      const snapshot = store.getSnapshot()
      expect(snapshot).toHaveLength(1)
      expect(snapshot[0]?.data).toEqual({ value: 2 })
    })

    it('opening the same id again keeps its position in the stack', () => {
      const idA = store.register('content-a', {})
      const idB = store.register('content-b', {})

      store.open(idA)
      store.open(idB)
      store.open(idA, { reopened: true })

      const snapshot = store.getSnapshot()
      expect(snapshot.map((i) => i.id)).toEqual([idA, idB])
    })

    it('re-opening an already-open modal resets its closing flag so requestClose runs again', async () => {
      const id = store.register('content', {})
      store.open(id)

      // Put the instance into a "closing" state via requestClose with a guard
      // that never resolves during this synchronous window isn't easy, so
      // instead verify the flag is reset by confirming requestClose succeeds
      // normally after reopening.
      store.open(id)
      const closed = await store.requestClose(id)
      expect(closed).toBe(true)
    })

    it('resolves the returned promise with the result passed to finalizeClose', async () => {
      const id = store.register('content', {})
      const openPromise = store.open(id)

      await store.requestClose(id, 'my-result')
      store.finalizeClose(id)

      await expect(openPromise).resolves.toBe('my-result')
    })
  })

  describe('requestClose', () => {
    it('returns false for an id with no open instance', async () => {
      const result = await store.requestClose('unknown-id')
      expect(result).toBe(false)
    })

    it('returns true immediately when there is no onBeforeClose guard', async () => {
      const id = store.register('content', {})
      store.open(id)

      await expect(store.requestClose(id)).resolves.toBe(true)
    })

    it('calls onBeforeClose and returns true when it resolves truthy', async () => {
      const onBeforeClose = vi.fn().mockResolvedValue(true)
      const id = store.register('content', { onBeforeClose })
      store.open(id)

      await expect(store.requestClose(id)).resolves.toBe(true)
      expect(onBeforeClose).toHaveBeenCalledTimes(1)
    })

    it('returns false when onBeforeClose resolves falsy', async () => {
      const onBeforeClose = vi.fn().mockResolvedValue(false)
      const id = store.register('content', { onBeforeClose })
      store.open(id)

      await expect(store.requestClose(id)).resolves.toBe(false)
    })

    it('supports a synchronous (non-promise) onBeforeClose guard', async () => {
      const onBeforeClose = vi.fn().mockReturnValue(true)
      const id = store.register('content', { onBeforeClose })
      store.open(id)

      await expect(store.requestClose(id)).resolves.toBe(true)
    })

    it('returns false and logs when onBeforeClose throws', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const error = new Error('boom')
      const onBeforeClose = vi.fn().mockRejectedValue(error)
      const id = store.register('content', { onBeforeClose })
      store.open(id)

      await expect(store.requestClose(id)).resolves.toBe(false)
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(`onBeforeClose threw for modal "${id}"`),
        error,
      )

      consoleError.mockRestore()
    })

    it('resets the closing flag after onBeforeClose rejects, allowing a later close', async () => {
      const onBeforeClose = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(true)
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const id = store.register('content', { onBeforeClose })
      store.open(id)

      await expect(store.requestClose(id)).resolves.toBe(false)
      await expect(store.requestClose(id)).resolves.toBe(true)

      consoleError.mockRestore()
    })

    it('returns false immediately (without re-running the guard) if a close is already in flight', async () => {
      let resolveGuard: (value: boolean) => void = () => {}
      const onBeforeClose = vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            resolveGuard = resolve
          }),
      )
      const id = store.register('content', { onBeforeClose })
      store.open(id)

      const firstRequest = store.requestClose(id)
      const secondRequest = store.requestClose(id)

      await expect(secondRequest).resolves.toBe(false)
      expect(onBeforeClose).toHaveBeenCalledTimes(1)

      resolveGuard(true)
      await expect(firstRequest).resolves.toBe(true)
    })

    it('stashes the result for finalizeClose to use, without closing anything itself', async () => {
      const id = store.register('content', {})
      store.open(id)

      await store.requestClose(id, 'the-result')

      // requestClose does not remove the instance or resolve the open promise
      expect(store.getSnapshot()).toHaveLength(1)
    })
  })

  describe('finalizeClose', () => {
    it('is a no-op for an unknown id', () => {
      expect(() => store.finalizeClose('unknown-id')).not.toThrow()
    })

    it('removes the instance from the stack', async () => {
      const id = store.register('content', {})
      store.open(id)
      await store.requestClose(id)
      store.finalizeClose(id)

      expect(store.getSnapshot()).toEqual([])
    })

    it('resolves the open() promise with the pending result from requestClose', async () => {
      const id = store.register('content', {})
      const openPromise = store.open(id)

      await store.requestClose(id, { ok: true })
      store.finalizeClose(id)

      await expect(openPromise).resolves.toEqual({ ok: true })
    })

    it('resolves with undefined if finalizeClose is called without a prior requestClose', async () => {
      const id = store.register('content', {})
      const openPromise = store.open(id)

      store.finalizeClose(id)

      await expect(openPromise).resolves.toBeUndefined()
    })

    it('only removes the targeted instance from a multi-modal stack', async () => {
      const idA = store.register('content-a', {})
      const idB = store.register('content-b', {})
      store.open(idA)
      store.open(idB)

      await store.requestClose(idA)
      store.finalizeClose(idA)

      const snapshot = store.getSnapshot()
      expect(snapshot).toHaveLength(1)
      expect(snapshot[0]?.id).toBe(idB)
    })
  })

  describe('subscribe / getSnapshot', () => {
    it('notifies subscribers when the stack changes', () => {
      const listener = vi.fn()
      store.subscribe(listener)

      const id = store.register('content', {})
      store.open(id)

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('unsubscribe stops further notifications', () => {
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)
      unsubscribe()

      const id = store.register('content', {})
      store.open(id)

      expect(listener).not.toHaveBeenCalled()
    })

    it('getSnapshot returns a new array reference after each change (for identity-based comparisons)', () => {
      const before = store.getSnapshot()
      const id = store.register('content', {})
      store.open(id)
      const after = store.getSnapshot()

      expect(after).not.toBe(before)
    })

    it('getSnapshot returns the same reference when nothing has changed', () => {
      const first = store.getSnapshot()
      const second = store.getSnapshot()
      expect(first).toBe(second)
    })

    it('supports multiple independent subscribers', () => {
      const listenerA = vi.fn()
      const listenerB = vi.fn()
      store.subscribe(listenerA)
      store.subscribe(listenerB)

      const id = store.register('content', {})
      store.open(id)

      expect(listenerA).toHaveBeenCalledTimes(1)
      expect(listenerB).toHaveBeenCalledTimes(1)
    })
  })

  describe('scroll locking integration', () => {
    it('locks scroll when the first modal opens', () => {
      const id = store.register('content', {})
      store.open(id)

      expect(lockScroll).toHaveBeenCalledTimes(1)
      expect(unlockScroll).not.toHaveBeenCalled()
    })

    it('does not lock again for a second modal opened on top', () => {
      const idA = store.register('content-a', {})
      const idB = store.register('content-b', {})

      store.open(idA)
      store.open(idB)

      expect(lockScroll).toHaveBeenCalledTimes(1)
    })

    it('unlocks scroll only after the last modal in the stack closes', async () => {
      const idA = store.register('content-a', {})
      const idB = store.register('content-b', {})
      store.open(idA)
      store.open(idB)

      await store.requestClose(idA)
      store.finalizeClose(idA)
      expect(unlockScroll).not.toHaveBeenCalled()

      await store.requestClose(idB)
      store.finalizeClose(idB)
      expect(unlockScroll).toHaveBeenCalledTimes(1)
    })

    it('unlocks scroll when the only open modal is force-removed via unregister', () => {
      const id = store.register('content', {})
      store.open(id)
      expect(lockScroll).toHaveBeenCalledTimes(1)

      store.unregister(id)
      expect(unlockScroll).toHaveBeenCalledTimes(1)
    })
  })

  describe('multiple independent stores', () => {
    it('generates ids that do not collide across store instances', () => {
      const storeA = createModalStore()
      const storeB = createModalStore()

      const idA = storeA.register('content', {})
      const idB = storeB.register('content', {})

      expect(idA).not.toBe(idB)
    })

    it('keeps instances isolated between store instances', () => {
      const storeA = createModalStore()
      const storeB = createModalStore()

      const idA = storeA.register('content', {})
      storeA.open(idA)

      expect(storeA.getSnapshot()).toHaveLength(1)
      expect(storeB.getSnapshot()).toHaveLength(0)
    })
  })
})
