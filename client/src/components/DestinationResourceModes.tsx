import React from "react";
import { Download, Layers3, MapPin, MapPinOff, Signpost, MapPinned } from "lucide-react";
import PremiumFilterModeOption from "./PremiumFilterModeOption";
import type { PlannerDestinationResource } from "@/lib/plannerDestinationResources";

const modes = [
  { value: "all", label: "Todos os destinos", detail: "Catálogo de lugares", icon: Layers3 },
  { value: "coordinates", label: "Com coordenadas", detail: "Posição cadastrada", icon: MapPin },
  { value: "missing", label: "Sem coordenadas", detail: "Consulte pelo endereço", icon: MapPinOff },
  { value: "streets", label: "Ruas e avenidas", detail: "Referências aproximadas", icon: Signpost },
  { value: "areas", label: "Bairros e setores", detail: "Referências por nome", icon: MapPinned },
  { value: "prepared", label: "Rota offline salva", detail: "Desta origem e neste modo", icon: Download },
] as const;

export default function DestinationResourceModes({ value, counts, onChange, streets = false, updating = false }: {
  value: PlannerDestinationResource;
  counts: { all: number; coordinates: number; missing: number; streets?: number; areas?: number; prepared?: number };
  onChange: (mode: PlannerDestinationResource) => void;
  streets?: boolean;
  updating?: boolean;
}) {
  return (
    <div className="my-3 min-w-0 rounded-2xl border border-primary/15 bg-primary/[.035] p-3">
      <p className="text-xs font-black uppercase tracking-[.12em] text-primary">Escolha o tipo de destino</p>
      <div role="group" aria-label="Recursos dos destinos" className="mt-2 grid min-w-0 grid-cols-2 gap-2">
        {modes.filter(mode => streets || (mode.value !== "streets" && mode.value !== "areas" && mode.value !== "prepared")).map(mode => (
          <PremiumFilterModeOption key={mode.value} layout="grid" label={mode.label} ariaLabel={mode.label}
            detail={mode.detail} icon={mode.icon} selected={value === mode.value} onSelect={() => onChange(mode.value)}
            availability={updating ? "Atualizando" : `${counts[mode.value] ?? 0} ${(counts[mode.value] ?? 0) === 1 ? "destino" : "destinos"}`} />
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Combine o modo com a busca e a categoria. Destinos sem coordenadas não têm marcador e podem exigir pesquisa externa. Rotas por ruas offline precisam de preparação.
        {streets && " Bairros e setores são referências nominais do cadastro municipal, não pontos geocodificados. Rotas offline salvas exigem origem e modo iguais aos da cópia deste aparelho, com geometria de ruas; podem estar desatualizadas. Ruas e avenidas ficam na categoria Cidade/Centro: o ponto central do trecho não identifica uma casa ou entrada."}
        {!streets && " As quantidades correspondem à lista de destinos; postos ANP também podem aparecer no mapa."}
      </p>
    </div>
  );
}
