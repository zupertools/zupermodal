import type { ModalConfig } from '@zupertools/modal-core'
import { useZuperModal } from '../useZuperModal'
import type { RenderArgs } from '../types'

export interface ModalApi<TData = void, TResult = void> {
  openModal: (data: TData) => Promise<TResult>
  closeModal: (result?: TResult) => void
  isOpen: boolean
}

export type CapturedRenderArgs<TData = unknown, TResult = unknown> = RenderArgs<
  TData,
  TResult
>

export interface Box<T> {
  current: T
}

export function createBox<T>(initial: T): Box<T> {
  return { current: initial }
}

interface TestModalProps<TData, TResult> {
  config: ModalConfig
  apiBox: Box<ModalApi<TData, TResult> | null>
  // Left as Box<unknown> (rather than Box<CapturedRenderArgs<TData, TResult>
  // | null>) so call sites can share a single loosely-typed box and narrow
  // it locally with `as` where they need specific fields, without fighting
  // TData/TResult inference at every render callback.
  argsBox: Box<unknown>
  renderCountBox?: Box<number>
}

// Minimal harness component: registers a modal via useZuperModal, stashes the
// latest returned API and render-args into plain boxes so tests can drive
// and inspect it imperatively without needing to re-render / re-query DOM
// for everything.
export function TestModal<TData = void, TResult = void>({
  config,
  apiBox,
  argsBox,
  renderCountBox,
}: TestModalProps<TData, TResult>) {
  const api = useZuperModal<TData, TResult>(config, (args) => {
    argsBox.current = args
    if (renderCountBox) renderCountBox.current += 1
    return (
      <dialog data-testid="dialog" {...args.bind()}>
        <div data-testid="content">
          {args.isOpen ? JSON.stringify(args.data ?? null) : 'closed'}
        </div>
        <form method="dialog">
          <button
            type="submit"
            value="submitted-value"
            data-testid="submit-btn"
          >
            submit
          </button>
        </form>
      </dialog>
    )
  })
  apiBox.current = api
  return null
}
