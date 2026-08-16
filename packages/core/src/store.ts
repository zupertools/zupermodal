import { lockScroll, unlockScroll } from './scroll-lock'
import type { ModalConfig, ModalInstance, ModalStore } from './types'

let idCounter = 0
function generateId(): string {
  idCounter += 1
  return `zuper-modal-${idCounter}`
}

interface Definition {
  content: unknown
  config: ModalConfig
}

// Internal-only fields layered onto ModalInstance. Not part of the public
// type, but present on the same objects getSnapshot() returns.
interface InternalInstance extends ModalInstance {
  pendingResult?: unknown
  closing: boolean
}

export function createModalStore(): ModalStore {
  const definitions = new Map<string, Definition>()
  let instances: InternalInstance[] = []
  const listeners = new Set<() => void>()

  function emit(): void {
    // New array reference each time so useSyncExternalStore / Svelte stores /
    // Vue refs relying on identity comparison correctly see a change.
    instances = [...instances]
    listeners.forEach((listener) => listener())
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function getSnapshot(): ModalInstance[] {
    return instances
  }

  function register(content: unknown, config: ModalConfig): string {
    const id = generateId()
    definitions.set(id, { content, config })
    return id
  }

  function unregister(id: string): void {
    definitions.delete(id)

    // Component unmounted while its modal was still open/closing: force it out of the stack
    const existing = instances.find((instance) => instance.id === id)
    if (!existing) return

    existing.resolve(undefined)
    instances = instances.filter((instance) => instance.id !== id)

    if (instances.length === 0) unlockScroll()
    emit()
  }

  function open(id: string, data?: unknown): Promise<unknown> {
    const definition = definitions.get(id)
    if (!definition) {
      throw new Error(
        `[zupermodal] Tried to open modal "${id}" but it isn't registered. Make sure the component calling useZuperModal is mounted.`,
      )
    }

    const existing = instances.find((instance) => instance.id === id)
    if (existing) {
      // Already open: resolve the stale promise so it doesn't hang forever,
      // update the data in place, and keep the modal's position in the stack
      existing.resolve(undefined)
      existing.data = data
      existing.closing = false

      return new Promise((resolve) => {
        existing.resolve = resolve
        emit()
      })
    }

    if (instances.length === 0) lockScroll()

    return new Promise((resolve) => {
      const instance: InternalInstance = {
        id,
        content: definition.content,
        data,
        config: definition.config,
        resolve,
        closing: false,
      }

      instances.push(instance)
      emit()
    })
  }

  async function requestClose(id: string, result?: unknown): Promise<boolean> {
    const instance = instances.find((i) => i.id === id)
    if (!instance || instance.closing) return false

    if (instance.config.onBeforeClose !== undefined) {
      instance.closing = true
      try {
        const allowed = await instance.config.onBeforeClose()
        if (!allowed) return false
      } catch (error) {
        console.error(
          `[zupermodal] onBeforeClose threw for modal "${id}":`,
          error,
        )
        return false
      } finally {
        instance.closing = false
      }
    }

    instance.pendingResult = result
    return true
  }

  function finalizeClose(id: string): void {
    const instance = instances.find((i) => i.id === id)
    if (!instance) return

    instances = instances.filter((i) => i.id !== id)
    instance.resolve(instance.pendingResult)

    if (instances.length === 0) unlockScroll()
    emit()
  }

  return {
    subscribe,
    getSnapshot,
    register,
    unregister,
    open,
    requestClose,
    finalizeClose,
  }
}
