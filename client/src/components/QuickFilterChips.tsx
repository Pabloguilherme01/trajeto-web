import React from "react";
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
  if (!options.length) return null;
  return (
    <div
      role="group"
      aria-label={label}
      className={"mobile-scroll-x flex max-w-full gap-2 overflow-x-auto pb-1 " + className}
    >
      {options.map(option => {
        const active = normalizeCatalogText(value) === normalizeCatalogText(option.value);
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
