import React, { useEffect, useMemo, useRef } from "react";
import { normalizeCatalogText } from "@/lib/catalogSearch";

export type QuickFilterOption = { label: string; value: string };

export default function QuickFilterChips({
  label = "Filtros rápidos",
  options,
  value = "",
  onPick,
  variant = "dark",
  className = "",
}: {
  label?: string;
  options: QuickFilterOption[];
  value?: string;
  onPick: (value: string) => void;
  variant?: "dark" | "light";
  className?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const normalizedValue = normalizeCatalogText(value);
  // Chip definitions remain stable while the user types: normalize them once
  // instead of on every render of the surrounding map/planner.
  const normalizedOptions = useMemo(() => options.map(option => ({
    ...option,
    normalizedValue: normalizeCatalogText(option.value),
  })), [options]);
  useEffect(() => {
    const rail = railRef.current;
    const selected = rail?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (!rail || !selected || typeof rail.scrollBy !== "function") return;
    // Reveal the active filter inside its own horizontal row, never scroll
    // the page (important on small phones and on filtered deep links).
    const viewport = rail.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    const inset = 8;
    const offset = item.left < viewport.left + inset
      ? item.left - viewport.left - inset
      : item.right > viewport.right - inset
        ? item.right - viewport.right + inset
        : 0;
    if (offset) rail.scrollBy({ left: offset, behavior: "auto" });
  }, [normalizedValue, normalizedOptions]);

  if (!options.length) return null;
  return (
    <div
      ref={railRef}
      role="group"
      aria-label={label}
      className={"mobile-scroll-x flex max-w-full gap-2 overflow-x-auto pb-1 " + className}
    >
      {normalizedOptions.map(option => {
        const active = Boolean(normalizedValue) && normalizedValue === option.normalizedValue;
        return (
          <button
            key={option.label + "|" + option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(option.value)}
            className={
              "min-h-11 shrink-0 rounded-full border px-3 text-xs font-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
              (variant === "light"
                ? active
                  ? "border-accent/40 bg-accent/10 text-accent focus-visible:outline-ring"
                  : "border-border bg-card/95 text-card-foreground hover:border-accent/30 focus-visible:outline-ring"
                : active
                  ? "border-primary/50 bg-primary/10 text-primary focus-visible:outline-ring"
                  : "border-border/60 bg-muted/40 text-foreground/80 hover:border-accent/30 hover:text-foreground focus-visible:outline-ring")
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
