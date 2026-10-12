import React from "react";
import { X } from "lucide-react";

export type ActiveRefinement = {
  id: string;
  label: string;
  onRemove: () => void;
};

/** Single compact way to inspect and undo refinements on touch and keyboard. */
export default function ActiveRefinementChips({
  label, items, onClearAll,
}: {
  label: string;
  items: ActiveRefinement[];
  onClearAll?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div role="group" aria-label={label} className="my-3 min-w-0 rounded-2xl border border-primary/15 bg-primary/[.025] p-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black text-foreground">{items.length} {items.length === 1 ? "filtro ativo" : "filtros ativos"}</p>
        {items.length > 1 && onClearAll && (
          <button type="button" onClick={onClearAll}
            className="min-h-11 rounded-xl px-3 text-xs font-bold text-primary focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Limpar todos os refinamentos">
            Limpar filtros
          </button>
        )}
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap gap-2">
        {items.map(item => (
          <button type="button" key={item.id} onClick={item.onRemove}
            aria-label={"Remover filtro: " + item.label}
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-primary/20 bg-card px-3 py-2 text-left text-xs font-bold text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <span className="min-w-0 break-words">{item.label}</span>
            <X aria-hidden="true" className="size-4 shrink-0 text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}
