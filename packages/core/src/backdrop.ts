/**
 * For a native <dialog>, the element itself occupies the full viewport
 * as its rendering box. The visible "backdrop" area outside your content
 * is still part of the <dialog> element, while your content is a descendant.
 * So a real backdrop click is one where the event target IS the dialog node,
 * not something inside it.
 */
export function isBackdropClick(
  event: { target: EventTarget | null },
  dialogNode: HTMLElement,
): boolean {
  return event.target === dialogNode
}
