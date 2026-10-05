import React from "react";

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
        const active = value.trim().toLocaleLowerCase("pt-BR") === option.value.trim().toLocaleLowerCase("pt-BR");
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
                  ? "border-[#147b88] bg-[#147b88] text-white focus-visible:outline-[#147b88]"
                  : "border-slate-200 bg-white/95 text-slate-700 hover:border-[#147b88]/40 focus-visible:outline-[#147b88]"
                : active
                  ? "border-[#C7FF3C]/55 bg-[#C7FF3C]/15 text-[#E6FFAB] focus-visible:outline-[#C7FF3C]"
                  : "border-white/12 bg-white/[.035] text-white/75 hover:border-[#3DE3FF]/30 hover:text-white focus-visible:outline-[#3DE3FF]")
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
