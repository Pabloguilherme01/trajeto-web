import React, { useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Move, MapPinned } from "lucide-react";

/** Keep the same map mounted when resizing so camera and GPS state survive. */
export default function MapExplorerFrame({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (!expanded) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    // Escape transformed layout ancestors without remounting the map or GPS.
    const element = root.current;
    const parent = element?.parentNode;
    const nextSibling = element?.nextSibling;
    if (element) (document.getElementById("root") ?? document.body).appendChild(element);
    document.body.style.overflow = "hidden";
    toggle.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setExpanded(false);
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        root.current?.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, [tabindex]"
        ) ?? []
      ).filter(
        item =>
          item.tabIndex >= 0 &&
          !item.matches(":disabled") &&
          item.getClientRects().length > 0
      );
      const first = items[0],
        last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        root.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !root.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !root.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      if (element && parent) parent.insertBefore(element, nextSibling ?? null);
      // React finishes the layout update after cleanup; restore focus afterward.
      const opener = toggle.current;
      queueMicrotask(() => {
        if (opener?.isConnected) opener.focus({ preventScroll: true });
        else if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      });
    };
  }, [expanded]);
  return (
    <div
      ref={root}
      tabIndex={-1}
      data-expanded={expanded}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? `${label} em tela cheia` : undefined}
      className={`map-explorer-frame min-w-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-background shadow-[0_28px_80px_rgba(0,0,0,.28)] ${expanded ? "fixed inset-0 z-[1000] flex flex-col rounded-none border-0 bg-background p-2" : "relative"}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 bg-[linear-gradient(110deg,#10202a,#0B1014_58%,#102a2b)] p-2.5 text-white">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-black"><MapPinned className="size-4 text-accent" />{label}</span>
          <span className="mt-1 hidden items-center gap-1.5 text-[0.68rem] font-bold text-white/55 min-[360px]:flex"><Move className="size-3" />Arraste · pinça para zoom · toque nos pontos</span>
        </div>
        <button
          ref={toggle}
          type="button"
          onClick={() => setExpanded(value => !value)}
          aria-label={
            expanded ? "Sair da tela cheia" : "Abrir mapa em tela cheia"
          }
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-white/12 bg-white/[.05] px-3 text-xs font-black text-white shadow-lg backdrop-blur hover:border-accent/30"
        >
          {expanded ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
          {expanded ? "Fechar" : "Tela cheia"}
        </button>
      </div>
      <div className={expanded ? "min-h-0 flex-1 overflow-auto" : "min-w-0"}>
        {children}
      </div>
    </div>
  );
}
