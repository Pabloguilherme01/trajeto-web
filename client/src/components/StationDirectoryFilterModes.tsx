import React from "react";
import PremiumFilterModeOption from "@/components/PremiumFilterModeOption";
import { BadgeCheck, Layers3, MapPin, Route } from "lucide-react";
import type { StationDirectoryMode, StationDirectoryPreset } from "@/lib/stationDirectoryModes";

const modes = [
  { id: "all", title: "Todos", detail: "Visão completa", icon: Layers3 },
  { id: "anp", title: "Dados ANP", detail: "Fonte identificada", icon: BadgeCheck },
  { id: "route", title: "Com rota", detail: "Com coordenadas", icon: Route },
  { id: "address", title: "Endereço", detail: "Local informado", icon: MapPin },
] as const;

export default function StationDirectoryFilterModes({
  mode,
  onSelect,
}: {
  mode: StationDirectoryMode;
  onSelect: (mode: StationDirectoryPreset) => void;
}) {
  return (
    <div className="mt-4 min-w-0 rounded-[1.4rem] border border-primary/15 bg-primary/[.035] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[.14em] text-primary">Modos rápidos</p>
          <h3 className="mt-1 text-sm font-bold text-foreground">Como prefere explorar os postos?</h3>
        </div>
        {mode === "custom" && (
          <span role="status" className="rounded-full border border-accent/20 bg-accent/[.06] px-2.5 py-1 text-xs font-bold text-accent">
            Personalizado
          </span>
        )}
      </div>
      <div
        role="group"
        aria-label="Modos de filtro dos postos"
        className="mobile-scroll-x mt-3 flex max-w-full min-w-0 gap-2 overflow-x-auto pb-1"
      >
        {modes.map(option => (
          <PremiumFilterModeOption
            key={option.id}
            layout="rail"
            label={option.title}
            detail={option.detail}
            icon={option.icon}
            selected={mode === option.id}
            onSelect={() => onSelect(option.id)}
          />
        ))}}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Combine um modo com sua busca, combustível e ordem. Para cruzar vários critérios, use os filtros detalhados abaixo.
      </p>
    </div>
  );
}
