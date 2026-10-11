import { useEffect, useRef, type FocusEvent } from "react";

/** Reveal controls inside the rail without moving the page or stealing focus. */
function reveal(rail: HTMLDivElement, control: HTMLElement) {
  if (typeof rail.scrollBy !== "function") return;
  const viewport = rail.getBoundingClientRect();
  const item = control.getBoundingClientRect();
  const inset = 8;
  const offset = item.left < viewport.left + inset
    ? item.left - viewport.left - inset
    : item.right > viewport.right - inset
      ? item.right - viewport.right + inset
      : 0;
  if (offset) rail.scrollBy({ left: offset, behavior: "auto" });
}

export function useFilterRail(selection: string, options: unknown) {
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const selected = rail?.querySelector<HTMLElement>('button[aria-pressed="true"]');
    if (rail && selected) reveal(rail, selected);
  }, [selection, options]);

  function onFocusCapture(event: FocusEvent<HTMLDivElement>) {
    const control = event.target.closest<HTMLElement>("button");
    if (control && event.currentTarget.contains(control)) reveal(event.currentTarget, control);
  }

  return { railRef, onFocusCapture };
}
