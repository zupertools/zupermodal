export interface ModalInstance {
  id: string
  content: unknown
  data: unknown
  config: ModalConfig
  resolve: (result: unknown) => void
}

export interface ModalConfig {
  closeOnEsc?: boolean
  closeOnBackdropClick?: boolean
  onBeforeClose?: () => boolean | Promise<boolean>
  closeTransition?: boolean
}

export interface ModalStore {
  subscribe(listener: () => void): () => void
  getSnapshot(): ModalInstance[]

  register(content: unknown, config: ModalConfig): string
  unregister(id: string): void

  open(id: string, data?: unknown): Promise<unknown>

  /**
   * Runs the 'onBeforeClose' guard and reports whether the caller may proceed.
   * Does not close anything or resolve the open() promise. The caller is
   * responsible for calling the native dialog's close() method afterward if
   * this resolves true. Returns false immediately, without re-running the
   * guard, if a close is already in flight.
   */
  requestClose(id: string, result?: unknown): Promise<boolean>

  /**
   * Call this from the dialog's native 'close' event listener. The single
   * point, regardless of what triggered the close, where the instance is
   * removed from the stack and the open() promise resolves with whatever
   * result was stashed by the most recent successful requestClose().
   */
  finalizeClose(id: string): void
}
