import React from "react";
import { X } from "lucide-react";
import {
  PUBLIC_SERVICE_CATEGORIES,
  PUBLIC_SERVICES,
  type PublicServiceCategory,
} from "@/lib/publicServices";
import { SERVICE_CATEGORY_COUNTS } from "@/lib/publicServicesPresentation";

type Category = PublicServiceCategory | "todos";

// The same six shortcuts, prepared once instead of filtering the full catalog
// on unrelated map, favorites, status or input renders.
const QUICK_IDS: ReadonlySet<Category> = new Set([
  "todos", "saude", "documentos", "trabalho", "assistencia", "agua-energia",
]);
const QUICK_CATEGORIES = PUBLIC_SERVICE_CATEGORIES.filter(item => QUICK_IDS.has(item.id));

export default function PublicServiceCategoryQuickFilters({
  category,
  onChange,
}: {
  category: Category;
  onChange: (category: Category) => void;
}) {
  const selectedOutsideShortcuts = !QUICK_IDS.has(category);
  const selectedLabel = selectedOutsideShortcuts
    ? PUBLIC_SERVICE_CATEGORIES.find(item => item.id === category)?.shortLabel
    : null;

  return (
    <div className="mb-2 min-w-0">
      <div
        role="group"
        aria-label="Categorias mais usadas"
        className="grid min-w-0 grid-cols-2 gap-2 min-[420px]:grid-cols-3"
      >
        {QUICK_CATEGORIES.map(item => {
          const selected = category === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={"Filtrar por " + item.shortLabel}
              aria-pressed={selected}
              onClick={() => onChange(item.id)}
              className={
                "flex min-h-12 min-w-0 items-center justify-between gap-1.5 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
                (selected
                  ? "border-primary/50 bg-primary/15 text-foreground shadow-sm"
                  : "border-border/20 bg-muted/40 text-foreground hover:border-primary/35")
              }
            >
              <span className="min-w-0 break-words leading-tight">{item.shortLabel}</span>
              <span
                aria-hidden="true"
                className="shrink-0 rounded-full bg-background/75 px-1.5 py-0.5 text-[11px] tabular-nums text-foreground"
              >
                {item.id === "todos" ? PUBLIC_SERVICES.length : SERVICE_CATEGORY_COUNTS[item.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
      {selectedLabel && (
        <div className="mt-2 flex min-w-0 items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/[.06] px-3 py-1.5">
          <span className="min-w-0 break-words text-xs font-semibold text-foreground">
            Categoria ativa: {selectedLabel}
          </span>
          <button
            type="button"
            aria-label={"Remover filtro da categoria " + selectedLabel}
            onClick={() => onChange("todos")}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X aria-hidden="true" className="size-3.5" />
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}
