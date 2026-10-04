import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Route as RouteIcon } from "lucide-react";
import { LOCAL_READY_ROUTES, ROUTE_DESTINATION_CATEGORIES, type RouteDestinationCategoryFilter } from "@/lib/localRoutePresets";
import { matchesCatalogText } from "@/lib/catalogSearch";
import { buildReusableTripPlannerUrl } from "@/lib/tripLinks";
import { DestinationActions } from "@/components/DestinationActions";
import { readyRouteDestination } from "@/lib/unifiedDestination";

type TravelMode = "driving" | "walking" | "cycling" | "transit";
const modes: Array<{ value: TravelMode; label: string }> = [
  { value: "driving", label: "Carro" }, { value: "walking", label: "A pé" },
  { value: "cycling", label: "Bicicleta" }, { value: "transit", label: "Transporte público" },
];

export default function ReadyRouteShortcuts({ compact = false, initialMode = "driving" }: { compact?: boolean; initialMode?: TravelMode }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RouteDestinationCategoryFilter>("todos");
  const [mode, setMode] = useState(initialMode);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setMode(initialMode), [initialMode]);
  const filtered = LOCAL_READY_ROUTES.filter(route =>
    (category === "todos" || category === route.category) &&
    matchesCatalogText(query, [route.label, route.origin, route.destination, route.detail])
  );
  const visible = expanded ? filtered : filtered.slice(0, 6);
  const clearFilters = () => { setQuery(""); setCategory("todos"); setExpanded(false); };
  const openRoute = (route: typeof LOCAL_READY_ROUTES[number], reverse = false) => {
    navigate(buildReusableTripPlannerUrl(reverse ? { origin: route.destination, destination: route.origin } : route, { auto: true }) + "&modo=" + mode);
  };
  return <details className="mt-4 min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[.02] p-4" data-compact={compact || undefined}>
    <summary className="min-h-11 cursor-pointer break-words text-sm font-black text-[#3DE3FF]">{LOCAL_READY_ROUTES.length} trajetos prontos pela cidade</summary>
    <p className="mt-2 text-xs leading-relaxed text-white/70">Busque um lugar, escolha como ir e toque em Calcular. Origem e destino já vêm preenchidos; você pode ajustar no planejador.</p>
    <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-3">
      <label className="min-w-0 text-xs font-bold text-white/80">Buscar trajeto
        <input type="search" value={query} onChange={event => { setQuery(event.target.value); setExpanded(false); }} placeholder="UPA, Prefeitura, Shopping…" autoComplete="off" enterKeyHint="search" className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-[#10181d] px-3 text-base text-white" />
      </label>
      <label className="min-w-0 text-xs font-bold text-white/80">Tipo de destino
        <select value={category} onChange={event => { setCategory(event.target.value as RouteDestinationCategoryFilter); setExpanded(false); }} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-[#10181d] px-3 text-base text-white">
          {ROUTE_DESTINATION_CATEGORIES.filter(item => item.value === "todos" || LOCAL_READY_ROUTES.some(route => route.category === item.value)).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-xs font-bold text-white/80">Como você vai?
        <select value={mode} onChange={event => setMode(event.target.value as TravelMode)} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-[#10181d] px-3 text-base text-white">
          {modes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p role="status" className="text-xs text-white/65">{filtered.length ? `${visible.length} de ${filtered.length} trajetos` : "Nenhum trajeto encontrado."}</p>
      {(query || category !== "todos") && <button type="button" onClick={clearFilters} className="min-h-11 rounded-xl border border-white/15 px-3 text-xs font-bold text-white">Limpar filtros</button>}
    </div>
    {!filtered.length && <p className="mt-2 text-xs text-white/65">Tente outro nome ou limpe os filtros para ver os trajetos disponíveis.</p>}
    <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
      {visible.map(route => {
        const [from, to] = route.label.split(" → ");
        return <article key={route.id} aria-label={route.label} className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#16232b] to-[#10181d] p-3">
          <div className="flex items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><RouteIcon className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-sm font-black leading-snug text-white">{route.label}</h3>
              <p className="mt-1 break-words text-xs text-white/65">{route.detail}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => openRoute(route)} aria-label={"Calcular " + route.label} className="min-h-11 min-w-0 break-words rounded-xl bg-[#C7FF3C] px-2 text-xs font-black text-[#102028]">Calcular rota</button>
            <button type="button" onClick={() => openRoute(route, true)} aria-label={`Calcular volta: ${to} → ${from}`} className="min-h-11 min-w-0 break-words rounded-xl border border-white/15 px-2 text-xs font-bold text-white">Fazer a volta</button>
          </div>
          <details className="mt-2 border-t border-white/10 pt-2">
            <summary className="min-h-11 cursor-pointer text-xs font-bold text-white/70">Detalhes e opções do destino</summary>
            <p className="mb-3 break-words text-xs leading-relaxed text-white/65">De: {route.origin}<br />Até: {route.destination}</p>
            <DestinationActions destination={readyRouteDestination(route)} compact />
          </details>
        </article>;
      })}
    </div>
    {filtered.length > 6 && <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="mt-3 min-h-11 w-full rounded-xl border border-[#3DE3FF]/25 px-3 text-sm font-bold text-[#3DE3FF]">{expanded ? "Mostrar menos trajetos" : `Ver mais ${filtered.length - 6} trajetos`}</button>}
    <p className="mt-3 text-xs leading-relaxed text-white/55">Sem internet, o caminho e a distância podem ser estimativas. Transporte público não informa horários em tempo real.</p>
  </details>;
}
