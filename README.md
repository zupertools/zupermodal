![zupermodal](https://raw.githubusercontent.com/zupertools/zupermodal/main/assets/banner.png)

# zupermodal

A headless modal library built on the native `<dialog>` element. You describe how a modal looks and when it should open, and zupermodal handles the stack, focus trapping, ESC and backdrop-click behavior, scroll locking, and resolving a promise when it closes.

- Built on `<dialog>`, not a reimplementation of it
- Promise-based: `openModal` resolves with whatever the modal was closed with
- Fully typed data in and result out, per modal
- Stacking, ref-counted scroll lock, and guarded closes out of the box
- Optional close transitions that respect `prefers-reduced-motion`

## Example with the React adapter

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

## Packages

| Package                                       | Description              |
| --------------------------------------------- | ------------------------ |
| [`@zupertools/modal-react`](./packages/react) | React adapter.           |
| [`@zupertools/modal-core`](./packages/core)   | Framework-agnostic core. |

## Development

This is a pnpm monorepo. To set up locally:

```bash
pnpm install
pnpm run build
pnpm run test
```

Each package in `packages/` can also be built and tested individually:

```bash
cd packages/core
pnpm run build
pnpm run test
```

## License

MIT
