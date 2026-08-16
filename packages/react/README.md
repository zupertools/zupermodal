![zupermodal](https://raw.githubusercontent.com/zupertools/zupermodal/refs/heads/main/assets/banner.png?raw=true)

# zupermodal (React)

A headless modal library for React built on the native `<dialog>` element. You describe how a modal looks and when it should open, and zupermodal handles the stack, focus trapping, ESC and backdrop-click behavior, scroll locking, and resolving a promise when it closes.

```tsx
function InfoModal() {
  const { openModal } = useZuperModal(
    { closeOnEsc: true, closeOnBackdropClick: true },
    ({ bind, onClose }) => (
      <dialog {...bind()}>
        <h2>This is a simple modal</h2>
        <p>Did you know that this modal is native?</p>
        <button onClick={() => onClose()}>Understand</button>
      </dialog>
    ),
  );
}

function ConfirmModal() {
  const { openModal } = useZuperModal<void, boolean>(
    { closeOnEsc: true, closeOnBackdropClick: true },
    ({ onClose, bind }) => (
      <dialog {...bind()}>
        <p>Are you sure?</p>
        <button onClick={() => onClose(false)}>Cancel</button>
        <button onClick={() => onClose(true)}>Confirm</button>
      </dialog>
    ),
  );

  async function handleConfirm() {
    const confirmed = await openModal();
    if (confirmed) await api.delete(item.id);
  }

  return <button onClick={handleConfirm}>Delete</button>;
}
```

## Features

- **Built on the native `<dialog>` element** - focus trapping, ESC handling, backdrop clicks, and scroll locking all layer on top of the platform primitive instead of reimplementing it
- **Fully typed open and close** - `useZuperModal<TData, TResult>` types the data passed to `openModal` and the result it resolves with
- **Promise-based** - `openModal` returns a promise that resolves with whatever value is passed to `onClose` or `closeModal`, so a confirm/cancel modal can be awaited like a regular async call
- **Dialogs stay mounted** - once a component calling `useZuperModal` is mounted, its `<dialog>` lives in a portal for the lifetime of that component, open or closed. `showModal()` and `close()` control visibility rather than conditional rendering, which matches how `<dialog>` is meant to be used
- **Stacking** - multiple modals can be open at once. The most recently opened modal is always on top.
- **Supports animations** - `closeTransition` delays the native `close()` call until a `transitionend` fires, so a dialog can animate out.
- **Guarded closes** - `onBeforeClose` in the config can cancel a close, for example to confirm discarding unsaved changes, regardless of what triggered it
- **`form method="dialog"` support** - submitting a form with `method="dialog"` inside a modal allows for a native way of passing data out of the modal

## Installation

```bash
npm install @zupertools/modal-react
```

```bash
pnpm add @zupertools/modal-react
```

## Core concepts

### The provider

```tsx
import { ZuperModalProvider } from "@zupertools/modal-react";

function App() {
  return <ZuperModalProvider>{/* rest of your app */}</ZuperModalProvider>;
}
```

Every dialog rendered by `useZuperModal` is portaled into `document.body` under this provider, so it only needs to wrap your app once, near the root.

### The hook

```tsx
const { openModal, closeModal, isOpen } = useZuperModal<TData, TResult>(
  config,
  render,
);
```

- `config`: `closeOnEsc`, `closeOnBackdropClick`, `onBeforeClose`, `closeTransition`. It's captured at registration time.
- `render` is called with the current `RenderArgs` whenever they change:
  - `isOpen` - whether this modal is currently open
  - `data` - the value passed to `openModal(data)`
  - `onClose(result?)` - closes the modal with a result, same as `closeModal`
  - `bind()` - returns the props your `<dialog>` element needs

### Binding the dialog

The render function must return a native `<dialog>` with `bind()` spread onto it:

```tsx
({ isOpen, data, onClose, bind }) => (
  <dialog {...bind()}>{/* your content */}</dialog>
);
```

`bind()` wires up the `close`, `cancel`, `click`, and `submit` handlers the dialog needs: resolving `openModal`'s promise when the dialog actually closes, respecting `closeOnEsc` on native Escape presses, detecting real backdrop clicks for `closeOnBackdropClick`, and intercepting `method="dialog"` form submissions.

### Opening and closing

`openModal(data)` opens the modal with `data` and returns a promise that resolves once the modal closes, with whatever result it was closed with:

```tsx
const confirmed = await openModal({ message: "Are you sure?" });
```

`closeModal(result?)` closes the modal from outside the `render` function, useful for closing it from elsewhere in your app.

### Guarding closes

`onBeforeClose` runs on every close attempt, no matter what triggered it (Escape, backdrop click, `onClose`, `closeModal`, a `method="dialog"` form submit):

```tsx
useZuperModal(
  {
    onBeforeClose: () => {
      if (isDirty) return window.confirm("Discard unsaved changes?");
      return true;
    },
  },
  render,
);
```

Returning (or resolving to) `false` cancels the close.

### Transitions

Setting `closeTransition: true` delays the actual `close()` call until a `transitionend` event fires on the dialog, so you can animate it out with CSS:

```css
dialog[data-closing] {
  opacity: 0;
  transition: opacity 150ms ease;
}
```

The `data-closing` attribute is set on the dialog while the transition runs, then removed right before `close()` is called. If the user has `prefers-reduced-motion: reduce` set, the wait is skipped entirely and the dialog closes immediately.

### Multiple modals

Each `useZuperModal` call registers its own dialog independently, so having several open at once needs no extra setup, whether that's two different modal components or the same modal opened again while already open. The store tracks the full stack, and scroll lock only releases once every open modal has closed.

## License

MIT
