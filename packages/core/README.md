![zupermodal](https://raw.githubusercontent.com/zupertools/zupermodal/refs/heads/main/assets/banner.png?raw=true)

# zupermodal (core)

The framework-agnostic core of zupermodal. It manages the modal stack, focus trapping, backdrop-click detection, and body scroll locking, and is designed around the native `<dialog>` element. It has no UI framework dependency and no external dependencies.

## What's in here

- **`createModalStore()`** - creates a reactive store that tracks the stack of currently-open modal instances. The store uses a subscribe/snapshot pattern compatible with `useSyncExternalStore` and similar primitives in other frameworks.
- **`trapFocus(node)`** - traps Tab focus cycling within a node. Call it once the node is in the DOM and visible. It returns a cleanup function to release the trap. It focuses the node (or its first focusable descendant) on setup if focus isn't already inside, but leaves the decision of _when_ to focus up to the caller.
- **`isBackdropClick(event, dialogNode)`** - for a native `<dialog>`, the backdrop area is part of the dialog element itself, while your content is a descendant. This checks whether the click event's target is the dialog node directly, i.e. a genuine backdrop click rather than a click inside the content.
- **`lockScroll()`** / **`unlockScroll()`** - ref-counted body scroll lock. Closing one modal in a stack of two won't re-enable body scroll while another is still open. Also compensates for scrollbar width so the page doesn't shift when scroll is locked.

## Building an adapter

The main thing you need is `createModalStore`. It returns a `ModalStore` object:

```ts
import { createModalStore } from "@zupertools/modal-core";

const store = createModalStore();

// Read state
store.getSnapshot(); // ModalInstance[]: the current stack, bottom to top

// Subscribe to changes (compatible with useSyncExternalStore or similar)
const unsubscribe = store.subscribe(() => {
  const instances = store.getSnapshot();
});
```

### Lifecycle

Each modal component registers itself once (typically on mount) and gets back an `id` used for every other call:

```ts
const id = store.register(content, config);
// ...later, on unmount
store.unregister(id);
```

Opening a modal pushes it onto the stack and returns a promise that resolves with whatever result the modal is eventually closed with. Calling `open` again on an already-open instance updates its data in place, keeps its position in the stack, and resolves the previous promise with `undefined` rather than leaving it hanging:

```ts
const result = await store.open(id, { userId: 42 });
```

Closing is split into two steps so adapters can run a real DOM close transition in between:

1. **`requestClose(id, result)`**: runs the `onBeforeClose` guard from the modal's config, and reports whether the caller may proceed. It does not remove anything from the stack or resolve the `open()` promise; it only stashes `result` for later. If a close is already in flight for that id, it returns `false` immediately without re-running the guard.
2. **`finalizeClose(id)`**: call this from the dialog's native `close` event listener. This is the single point, regardless of what triggered the close (Esc, backdrop click, a Close button, the guard above), where the instance is actually removed from the stack and the `open()` promise resolves with the result stashed by the most recent successful `requestClose()`.

A typical adapter wires it up like this:

```ts
async function handleCloseRequest(result?: unknown) {
  const canClose = await store.requestClose(id, result);
  if (canClose) dialogElement.close();
  // dialogElement's native 'close' event fires -> adapter calls store.finalizeClose(id)
}
```

### Config

Each modal's `ModalConfig` (passed to `register`) controls its own behavior:

```ts
interface ModalConfig {
  closeOnEsc?: boolean;
  closeOnBackdropClick?: boolean;
  onBeforeClose?: () => boolean | Promise<boolean>;
  closeTransition?: boolean;
}
```

`onBeforeClose` is your guard hook: return (or resolve to) `false` to cancel the close, e.g. for an unsaved-changes confirmation.

## License

MIT
