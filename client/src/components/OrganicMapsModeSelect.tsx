import React from "react";
import { Navigation } from "lucide-react";

export type OrganicMapsMode = "drive" | "walk" | "bike";

export default function OrganicMapsModeSelect({ value, onChange }: {
  value: OrganicMapsMode;
  onChange: (value: OrganicMapsMode) => void;
}) {
  return (
    <label className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/10 bg-background/70 px-3 py-2 text-xs font-bold text-foreground">
      <span className="inline-flex min-w-0 items-center gap-2">
        <Navigation className="size-4 shrink-0 text-primary" />
        <span>Modo no Organic Maps</span>
      </span>
      <select
        aria-label="Modo de navegação no Organic Maps"
        value={value}
        onChange={event => onChange(event.target.value as OrganicMapsMode)}
        className="min-h-11 min-w-0 max-w-full rounded-xl border border-border bg-background px-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <option value="drive">Carro</option>
        <option value="walk">A pé</option>
        <option value="bike">Bicicleta</option>
      </select>
    </label>
  );
}
