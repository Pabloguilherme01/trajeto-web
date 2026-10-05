import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { MapPin, ArrowUpRight, ArrowLeft, Search, Stethoscope, ShoppingBag, Landmark, Bus, GraduationCap, Fuel, Utensils } from "lucide-react";
import { LOCAL_READY_ROUTES, ROUTE_DESTINATION_CATEGORIES, type RouteDestinationCategoryFilter } from "@/lib/localRoutePresets";
import { matchesCatalogText } from "@/lib/catalogSearch";
import { buildReusableTripPlannerUrl } from "@/lib/tripLinks";
import { DestinationActions } from "@/components/DestinationActions";
import { readyRouteDestination } from "@/lib/unifiedDestination";
import QuickFilterChips from "@/components/QuickFilterChips";
import { ROUTE_QUICK_FILTERS, isQuickFilterValue, quickFilterCategory, quickFilterMatchesCategory } from "@/lib/quickFilterPresets";

type TravelMode = "driving" | "walking" | "cycling" | "transit";
const destinationIcons = { saude: Stethoscope, compras: ShoppingBag, servicos: Landmark, transporte: Bus, educacao: GraduationCap, combustivel: Fuel, alimentacao: Utensils, centro: MapPin };
const modes: Array<{ value: TravelMode; label: string }> = [
  { value: "driving", label: "Carro" }, { value: "walking", label: "A pé" },
  { value: "cycling", label: "Bicicleta" }, { value: "transit", label: "Transporte público" },
];

function readyRoutePriority(route: typeof LOCAL_READY_ROUTES[number]) {
  if (route.originId === "centro") return 0;
  if (route.originId === "prefeitura" || route.originId === "rodoviaria") return 1;
  if (["aguas-lindas-shopping", "upa", "heal", "hospital-bom-jesus"].includes(route.originId)) return 2;
  if (route.originId.startsWith("via-osm-")) return 3;
  if (route.originId.startsWith("ready-station-")) return 4;
  return 2;
}

export default function ReadyRouteShortcuts({ compact = false, initialMode = "driving" }: { compact?: boolean; initialMode?: TravelMode }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RouteDestinationCategoryFilter>("todos");
  const [originId, setOriginId] = useState("todos");
  const origins = useMemo(
    () => Array.from(new Map(LOCAL_READY_ROUTES.map(route => [route.originId, route.originLabel])).entries()),
    []
  );
  const [mode, setMode] = useState(initialMode);
  const [visibleCount, setVisibleCount] = useState(6);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine !== false);
  useEffect(() => setMode(initialMode), [initialMode]);
  useEffect(() => {
    const refreshConnection = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", refreshConnection);
    window.addEventListener("offline", refreshConnection);
    return () => {
      window.removeEventListener("online", refreshConnection);
      window.removeEventListener("offline", refreshConnection);
    };
  }, []);
  const offlineActive = offlineOnly || !online;
  const filtered = useMemo(
    () => LOCAL_READY_ROUTES.filter(route =>
      (originId === "todos" || originId === route.originId) &&
      (category === "todos" || category === route.category) &&
      matchesCatalogText(query, [route.label, route.origin, route.destination, route.detail])
    ).sort((a, b) => readyRoutePriority(a) - readyRoutePriority(b)),
    [originId, category, query]
  );
  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const clearFilters = () => { setQuery(""); setCategory("todos"); setOriginId("todos"); setVisibleCount(6); };
  const applyCategory = (next: RouteDestinationCategoryFilter) => {
    setCategory(next);
    if (
      isQuickFilterValue(query, ROUTE_QUICK_FILTERS) &&
      !quickFilterMatchesCategory(query, next)
    ) setQuery("");
    setVisibleCount(6);
  };
  const openRoute = (route: typeof LOCAL_READY_ROUTES[number], reverse = false) => {
    navigate(buildReusableTripPlannerUrl(reverse ? { origin: route.destination, destination: route.origin } : route, { auto: true }) + "&modo=" + mode + (offlineActive ? "&experiencia=offline" : ""));
  };
  return <details className="premium-panel mt-4 min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-xl" data-compact={compact || undefined}>
    <summary className="min-h-11 cursor-pointer break-words text-sm font-black text-accent">{LOCAL_READY_ROUTES.length} trajetos prontos pela cidade</summary>
    <p className="mt-2 text-xs leading-relaxed text-foreground/70">Busque um lugar, escolha como ir e toque em Ir até aqui. Origem e destino já vêm preenchidos; você pode ajustar no planejador.</p>
    <div className="mt-3" role="group" aria-label="O que você precisa fazer?">
      <p className="mb-2 text-xs font-bold text-foreground/80">O que você precisa fazer?</p>
      <div className="flex flex-wrap gap-2">
        {[
          { value: "saude", label: "Cuidar da saúde" },
          { value: "compras", label: "Fazer compras" },
          { value: "servicos", label: "Resolver documentos" },
          { value: "educacao", label: "Ir estudar" },
          { value: "combustivel", label: "Abastecer" },
          { value: "transporte", label: "Pegar transporte" },
          { value: "alimentacao", label: "Comer" },
          { value: "centro", label: "Ir para um bairro" },
        ].map(intent => <button key={intent.value} type="button" aria-pressed={category === intent.value}
          onClick={() => { setCategory(intent.value as RouteDestinationCategoryFilter); setQuery(""); setVisibleCount(6); }}
          className={`min-h-11 min-w-0 rounded-xl border px-3 text-xs font-bold ${category === intent.value ? "border-primary bg-primary/15 text-primary" : "border-white/15 bg-white/5 text-foreground/80"}`}>
          {intent.label}
        </button>)}
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Modo rápido de viagem">
      {modes.map(item => <button key={item.value} type="button" aria-pressed={mode === item.value}
        onClick={() => setMode(item.value)}
        className={`min-h-11 rounded-xl border px-3 text-xs font-bold ${mode === item.value ? "border-accent bg-accent/10 text-accent" : "border-white/15 text-foreground/70"}`}>
        {item.label}
      </button>)}
    </div>
    <button type="button" aria-pressed={offlineActive} disabled={!online} onClick={() => setOfflineOnly(value => !value)}
      className={`mt-3 min-h-11 rounded-xl border px-3 text-sm font-bold ${offlineActive ? "border-primary bg-primary/15 text-primary" : "border-white/15 text-foreground/80"} disabled:cursor-default disabled:opacity-100`}>
      {offlineActive ? "Offline ativo" : "Calcular offline"}
    </button>
    <p className="mt-2 text-xs leading-relaxed text-foreground/65">Após preparar o acesso offline neste aparelho, os locais deste catálogo ficam disponíveis sem internet. Para seguir pelas ruas, calcule e salve a ida e a volta no modo escolhido antes de sair. Sem trajeto viário salvo, o cálculo mostra uma estimativa identificada.</p>
    <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="min-w-0">
        <label className="text-xs font-bold text-foreground/80"><span className="inline-flex items-center gap-1.5"><Search className="size-3.5" />Buscar trajeto</span>
          <input type="search" value={query} onChange={event => { setQuery(event.target.value); setVisibleCount(6); }} placeholder="UPA, Prefeitura, Shopping…" autoComplete="off" enterKeyHint="search" className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base text-foreground" />
        </label>
        <QuickFilterChips
          label="Atalhos de busca de trajetos"
          options={ROUTE_QUICK_FILTERS}
          value={query}
          onPick={value => {
            setQuery(value);
            setCategory(quickFilterCategory(value) ?? "todos");
            setVisibleCount(6);
          }}
          className="mt-2"
        />
      </div>
      <label className="min-w-0 text-xs font-bold text-foreground/80">Saindo de
        <select value={originId} onChange={event => { setOriginId(event.target.value); setVisibleCount(6); }} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base text-foreground">
          <option value="todos">Todas as partidas</option>
          {origins.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-xs font-bold text-foreground/80">Tipo de destino
        <select value={category} onChange={event => applyCategory(event.target.value as RouteDestinationCategoryFilter)} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base text-foreground">
          {ROUTE_DESTINATION_CATEGORIES.filter(item => item.value === "todos" || LOCAL_READY_ROUTES.some(route => route.category === item.value)).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-xs font-bold text-foreground/80">Como você vai?
        <select value={mode} onChange={event => setMode(event.target.value as TravelMode)} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base text-foreground">
          {modes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p role="status" className="text-xs text-foreground/65">{filtered.length ? `${visible.length} de ${filtered.length} trajetos` : "Nenhum trajeto encontrado."}</p>
      {(query || category !== "todos" || originId !== "todos") && <button type="button" onClick={clearFilters} className="min-h-11 rounded-xl border border-white/15 px-3 text-xs font-bold text-foreground">Limpar filtros</button>}
    </div>
    {!filtered.length && <p className="mt-2 text-xs text-foreground/65">Tente outro nome ou limpe os filtros para ver os trajetos disponíveis.</p>}
    <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
      {visible.map(route => {
        const from = route.originLabel, to = route.destinationLabel;
        const DestinationIcon = destinationIcons[route.category];
        const categoryLabel = ROUTE_DESTINATION_CATEGORIES.find(item => item.value === route.category)?.label;
        return <article key={route.id} aria-label={route.label} className="premium-route-card min-w-0 overflow-hidden rounded-2xl border border-border bg-background p-4 shadow-lg transition-colors hover:border-accent/35">
          <div className="flex items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><DestinationIcon className="size-4" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-bold text-accent">{categoryLabel}</p>
              <h3 className="break-words text-base font-black leading-snug text-foreground">{to}</h3>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-foreground/85"><MapPin className="mt-0.5 size-3.5 shrink-0" /><span>Saída: {from}</span></p>
              <p className="mt-1 break-words text-xs text-foreground/65">{route.detail}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => openRoute(route)} aria-label={"Calcular " + route.label} className="min-h-11 min-w-0 break-words rounded-xl bg-primary px-2 text-xs font-black text-primary-foreground"><span className="inline-flex items-center justify-center gap-1">Ir até aqui<ArrowUpRight className="size-3.5 shrink-0" /></span></button>
            <button type="button" onClick={() => openRoute(route, true)} aria-label={`Calcular volta: ${to} → ${from}`} className="min-h-11 min-w-0 break-words rounded-xl border border-white/15 px-2 text-xs font-bold text-foreground"><span className="inline-flex items-center justify-center gap-1"><ArrowLeft className="size-3.5 shrink-0" />Fazer a volta</span></button>
          </div>
          <details className="mt-2 border-t border-white/10 pt-2">
            <summary className="min-h-11 cursor-pointer text-xs font-bold text-foreground/70">Detalhes e opções do destino</summary>
            <p className="mb-3 break-words text-xs leading-relaxed text-foreground/65">De: {route.origin}<br />Até: {route.destination}</p>
            <DestinationActions destination={readyRouteDestination(route)} compact />
          </details>
        </article>;
      })}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {visible.length < filtered.length && <button type="button" onClick={() => setVisibleCount(value => value + 12)} className="min-h-11 flex-1 rounded-xl border border-accent/25 px-3 text-sm font-bold text-accent">Ver mais {Math.min(12, filtered.length - visible.length)} trajetos</button>}
      {visibleCount > 6 && <button type="button" onClick={() => setVisibleCount(6)} className="min-h-11 rounded-xl border border-white/15 px-3 text-sm font-bold text-foreground/80">Mostrar menos trajetos</button>}
    </div>
    <p className="mt-3 text-xs leading-relaxed text-foreground/55">Sem internet, o caminho e a distância podem ser estimativas. Transporte público não informa horários em tempo real.</p>
  </details>;
}
