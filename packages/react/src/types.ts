import type { SubmitEvent, MouseEvent, RefObject, SyntheticEvent } from 'react'

export interface BindProps {
  ref: RefObject<HTMLDialogElement | null>
  onClose: () => void
  onCancel: (e: SyntheticEvent) => void
  onClick: (e: MouseEvent) => void
  // Intercepts <form method="dialog"> submissions inside the dialog so
  // they go through the requestClose -> (optional transition) -> close
  // pipeline.
  onSubmit: (e: SubmitEvent<HTMLDialogElement>) => void
}

export interface RenderArgs<TData, TResult = void> {
  isOpen: boolean
  data: TData
  // Same behavior as closeModal() from useZuperModal
  onClose: (result?: TResult) => void
  bind: () => BindProps
}
