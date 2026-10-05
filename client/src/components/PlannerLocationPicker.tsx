import React, { useEffect, useMemo, useState } from "react";
import { BUNDLED_CITY_ATLAS, buildCityAtlas, filterCityAtlas, type CityAtlasItem } from "@/lib/cityAtlas";
import { normalizeCatalogText } from "@/lib/catalogSearch";

import { useBusinessCatalog } from "@/hooks/useBusinessCatalog";
import { LOCAL_GEOCODE_POINTS } from "@/lib/localGeocoding";
import QuickFilterChips from "@/components/QuickFilterChips";
import { PLANNER_LOCATION_QUICK_FILTERS } from "@/lib/quickFilterPresets";

const points: CityAtlasItem[] = [...buildCityAtlas(BUNDLED_CITY_ATLAS), ...LOCAL_GEOCODE_POINTS.map(point => ({
  id: "geocode-" + point.id,
  name: point.name,
  detail: "Referência cadastrada · " + point.sourceLabel,
  category: "referencia" as const,
  lat: point.lat,
  lng: point.lng,
  sourceLabel: point.sourceLabel,
  sourceUrl: point.sourceUrl,
  verifiedAt: point.verifiedAt,
  keywords: point.aliases,
  coordinateKind: "mapped-point" as const,
}))];

function pickerItemScore(item: CityAtlasItem) {
  return (
    (item.coordinateKind === "mapped-point" ? 40 : item.coordinateKind === "street-midpoint" ? 25 : 10) +
    (Number.isFinite(item.lat) && Number.isFinite(item.lng) ? 20 : 0) +
    (item.address ? 4 : 0) +
    (item.verifiedAt ? 2 : 0)
  );
}

export function dedupePlannerLocationItems(items: CityAtlasItem[]) {
  const merged = new Map<string, CityAtlasItem>();
  for (const item of items) {
    const businessId = item.business?.cnpj?.replace(/\D/g, "");
    const name = normalizeCatalogText(item.name);
    const position = item.coordinateKind === "street-midpoint" ? "|" + item.lat + "|" + item.lng : "";
    const key = businessId ? "business:" + businessId : "place:" + (name || item.id) + position;
    const current = merged.get(key);
    if (!current || pickerItemScore(item) > pickerItemScore(current)) merged.set(key, item);
  }
  return [...merged.values()];
}

export default function PlannerLocationPicker({ kind, value, onChoose }: {
  kind: "origem" | "destino";
  value: string;
  onChoose: (coordinate: string) => void;
}) {
  const businesses = useBusinessCatalog();
  const allPoints = useMemo(() => dedupePlannerLocationItems([...points, ...businesses.items.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng))]), [businesses.items]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const quickQueries = PLANNER_LOCATION_QUICK_FILTERS;
  useEffect(() => { setVisibleCount(8); }, [query, kind]);
  const [selected, setSelected] = useState<{ coordinate: string; label: string } | null>(null);
  const matches = useMemo(() => {
    const normalizedQuery = normalizeCatalogText(query.trim());
    const filtered = filterCityAtlas(allPoints, query, "todos");
    if (normalizedQuery) {
      const strongMatches = filtered
        .filter(item =>
          normalizeCatalogText(item.name) === normalizedQuery ||
          (item.keywords ?? []).some(keyword => normalizeCatalogText(keyword) === normalizedQuery)
        )
        .sort((a, b) => pickerItemScore(b) - pickerItemScore(a));
      if (strongMatches.length) {
        const streets = strongMatches.filter(item => item.coordinateKind === "street-midpoint");
        if (streets.length > 1) return streets;
        const exactBusinesses = strongMatches.filter(item => Boolean(item.business?.cnpj));
        return exactBusinesses.length > 1 ? exactBusinesses : [strongMatches[0]];
      }
    }
    return filtered
      .map((item, index) => {
        const normalizedName = normalizeCatalogText(item.name);
        const relevance = !normalizedQuery
          ? 3
          : normalizedName.startsWith(normalizedQuery)
            ? 1
            : normalizedName.includes(normalizedQuery)
              ? 2
              : 3;
        return { item, relevance, index };
      })
      .sort((a, b) => a.relevance - b.relevance || pickerItemScore(b.item) - pickerItemScore(a.item) || a.index - b.index)
      .map(entry => entry.item);
  }, [allPoints, query]);
  const offlineReadyCount = useMemo(() => matches.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng)).length, [matches]);
  return <div className="mt-2 min-w-0 max-w-full overflow-hidden">
    <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} className="min-h-11 w-full rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.04] px-3 text-left text-xs font-bold text-[#C9F7FF]">Escolher {kind} no catálogo local</button>
    {selected?.coordinate === value && <p className="mt-1 break-words text-xs leading-relaxed text-white/60">{selected.label}</p>}
    {open && <div className="mt-2 rounded-xl border border-white/10 bg-[#0B1014] p-3">
      <label className="block text-xs font-bold text-white/65">Buscar {kind} local
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, rua ou bairro" className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#121B22] px-3 text-base text-white" autoComplete="off" enterKeyHint="search" />
      </label>
      <QuickFilterChips label={"Filtros rápidos para " + kind} options={quickQueries} value={query} onPick={value => { setQuery(value); setVisibleCount(8); }} className="mt-2" />
      <p className="mt-2 break-words text-xs text-white/55">{matches.length} lugares encontrados · {offlineReadyCount} com coordenadas para uso offline</p>
      {businesses.loading && <p role="status" className="mt-2 text-xs text-white/60">Carregando empresas locais…</p>}
      {businesses.error && <button type="button" onClick={businesses.retry} className="mt-2 min-h-11 text-xs text-[#FFD59B]">Tentar carregar empresas novamente</button>}
      <ul className="mt-2 grid gap-2" aria-label={"Pontos locais para " + kind}>
        {matches.slice(0, visibleCount).map(item => <li key={item.id}>
          <button type="button" aria-label={"Selecionar " + item.name} onClick={() => {
            const hasCoordinates = Number.isFinite(item.lat) && Number.isFinite(item.lng);
            const coordinate = kind === "origem" && item.business
              ? item.business.cnpj
              : hasCoordinates
                ? item.lat + ", " + item.lng
                : item.destination || item.address || item.name;
            const precision = item.coordinateKind === "street-midpoint"
              ? "Centro aproximado da via; não identifica uma casa ou entrada."
              : hasCoordinates
                ? item.coordinateLabel || item.sourceLabel
                : "Bairro/setor por nome; precisa de conexão para calcular quando não houver rota salva.";
            setSelected({ coordinate, label: item.name + " · " + precision });
            onChoose(coordinate);
            setOpen(false);
          }} className="min-h-12 min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-[#121B22] p-3 text-left">
            <span className="block break-words text-sm font-bold text-white">{item.name}</span>
            <span className="mt-1 block break-words text-xs text-white/55">{item.address || item.detail}</span>
            {item.coordinateLabel && <span className="mt-1 block break-words text-xs text-[#FFD59B]">{item.coordinateLabel}</span>}
            {item.coordinateKind === "street-midpoint" && <span className="mt-1 block break-words text-xs text-[#FFD59B]">Centro aproximado do trecho · {item.lat?.toFixed(5)}, {item.lng?.toFixed(5)}</span>}
            {!Number.isFinite(item.lat) && !Number.isFinite(item.lng) && <span className="mt-1 block break-words text-xs text-[#FFD59B]">Bairro/setor sem coordenada verificada · cálculo por nome quando houver conexão</span>}
          </button>
        </li>)}
      </ul>
      {matches.length > visibleCount && <button type="button" onClick={() => setVisibleCount(count => count + 8)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 px-3 text-xs font-bold text-white/75">Mostrar mais pontos ({visibleCount} de {matches.length})</button>}
      {!matches.length && <p className="mt-2 break-words text-xs text-white/65">Nenhum lugar cadastrado. Use outro nome, uma rua/bairro diferente ou informe o destino no campo principal.</p>}
    </div>}
  </div>;
}
