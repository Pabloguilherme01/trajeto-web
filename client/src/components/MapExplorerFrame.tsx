import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

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
  useEffect(() => {
    if (!expanded) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
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
      if (previousFocus?.isConnected) previousFocus.focus();
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
      className={`map-explorer-frame min-w-0 ${expanded ? "fixed inset-0 z-[1000] flex flex-col bg-[#0B1014] p-2" : "relative"}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 bg-[#0B1014] p-2 text-white">
        <span className="text-sm font-semibold">{label}</span>
        <button
          ref={toggle}
          type="button"
          onClick={() => setExpanded(value => !value)}
          aria-label={
            expanded ? "Sair da tela cheia" : "Abrir mapa em tela cheia"
          }
          className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-semibold"
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
