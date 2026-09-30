import { useEffect, useState } from "react";
import { AlertTriangle, Ban, Car, Clock3, RefreshCw, Route, Wallet } from "lucide-react";
import { fetchRouteIntelligence, type RouteIntelligence } from "@/lib/routeIntelligence";
import { fetchAppleRouteIntelligence, type AppleRouteIntelligence } from "@/lib/appleRouteIntelligence";
import { getMobileVehicle } from "@/lib/mobileVehicle";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDirectionsUrl, buildWazeNavigationUrl } from "@/lib/mobileTools";

type Props = {
  origin: string;
  destination: string;
  waypoints?: string[];
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  onConfirmRoute?: (routeId: string) => void;
  routeConfirmed?: boolean;
  onRoutesChange?: (routes: RouteIntelligence["routes"]) => void;
};

function formatDuration(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export default function RouteIntelligenceCard({ origin, destination, waypoints = [], avoidTolls, avoidHighways, selectedRouteId = "principal", onSelectRoute, onConfirmRoute, routeConfirmed = false, onRoutesChange }: Props) {
  const [data, setData] = useState<RouteIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [apple, setApple] = useState<AppleRouteIntelligence | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [avoidTollsState, setAvoidTollsState] = useState(Boolean(avoidTolls));
  const [avoidHighwaysState, setAvoidHighwaysState] = useState(Boolean(avoidHighways));
  const [tomtom, setTomtom] = useState<{ routes: Array<{ distanceMeters: number | null; durationSeconds: number | null; trafficDelaySeconds: number | null }> } | null>(null);
  const [trafficDetailed, setTrafficDetailed] = useState(false);
  const [fuelPrice, setFuelPrice] = useState(() => { try { return Number(localStorage.getItem("trajeto-route-fuel-price") || 0); } catch { return 0; } });
  const [decisionMode, setDecisionMode] = useState<"balanced" | "fastest" | "cheapest" | "no-tolls">(() => {
    try {
      const saved = localStorage.getItem("trajeto-route-decision-mode");
      return saved === "balanced" || saved === "fastest" || saved === "cheapest" || saved === "no-tolls" ? saved : "balanced";
    } catch {
      return "balanced";
    }
  });
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);
  const vehicle = getMobileVehicle();

  function fuelCost(route: RouteIntelligence["routes"][number] | undefined) {
    if (!route || !fuelPrice) return null;
    if (route.fuelConsumptionLiters != null && route.fuelConsumptionLiters > 0) return route.fuelConsumptionLiters * fuelPrice;
    if (!vehicle || vehicle.consumption <= 0 || !route.distanceMeters) return null;
    return (route.distanceMeters / 1000 / vehicle.consumption) * fuelPrice;
  }
  function totalCost(route: RouteIntelligence["routes"][number] | undefined) {
    if (!route) return null;
    const fuel = fuelCost(route);
    const routeToll = route.toll?.amount;
    return fuel != null && routeToll != null ? fuel + routeToll : null;
  }

  async function refresh(overrides?: { avoidTolls?: boolean; avoidHighways?: boolean }) {
    setLoading(true);
    setMessage("");
    try {
      const nextAvoidTolls = overrides?.avoidTolls ?? avoidTollsState;
      const nextAvoidHighways = overrides?.avoidHighways ?? avoidHighwaysState;
      const cacheKey = JSON.stringify({v:1,origin:origin.trim().toLocaleLowerCase("pt-BR"),destination:destination.trim().toLocaleLowerCase("pt-BR"),waypoints:waypoints.map(item=>item.trim().toLocaleLowerCase("pt-BR")),avoidTolls:nextAvoidTolls,avoidHighways:nextAvoidHighways,trafficDetailed});
      const cacheStorageKey = "trajeto-route-intelligence:" + btoa(unescape(encodeURIComponent(cacheKey))).slice(0,180);
      const now = Date.now();
      try {
        const cached = JSON.parse(sessionStorage.getItem(cacheStorageKey) || "null");
        if(cached && typeof cached==="object" && typeof cached.savedAt==="number" && now-cached.savedAt<120000 && cached.data){
          setData(cached.data as RouteIntelligence); setLastUpdatedAt(cached.savedAt); onRoutesChange?.((cached.data as RouteIntelligence).routes); return;
        }
      } catch {}
      const nextData = await fetchRouteIntelligence({origin,destination,waypoints,avoidTolls:nextAvoidTolls,avoidHighways:nextAvoidHighways,trafficDetailed});
      setData(nextData); setLastUpdatedAt(now); onRoutesChange?.(nextData.routes);
      try { sessionStorage.setItem(cacheStorageKey,JSON.stringify({savedAt:now,data:nextData})); } catch {}

      if (!selectedRouteId && nextData.routes[0]) onSelectRoute?.(nextData.routes[0].id);
    } catch (error) {
      const code = error instanceof Error && "code" in error ? (error as Error & { code?: string }).code : undefined;
      setMessage(code === "routing_provider_not_configured"
        ? "Dados avançados ainda não estão configurados no servidor."
        : "Não foi possível atualizar trânsito e pedágios agora.");
    } finally {
      setLoading(false);
    }
  }

  const main = data?.routes[0];
  useEffect(() => { setAvoidTollsState(Boolean(avoidTolls)); }, [avoidTolls]);
  useEffect(() => { setAvoidHighwaysState(Boolean(avoidHighways)); }, [avoidHighways]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem("trajeto-route-decision-mode", decisionMode); } catch {}
  }, [decisionMode]);
  useEffect(() => {
    if (!selectedRouteId) return;
    try { localStorage.setItem("trajeto-confirmed-route-id", selectedRouteId); } catch {}
  }, [selectedRouteId]);
  useEffect(() => { void refresh(); }, [origin, destination, waypoints.join("|"), avoidTollsState, avoidHighwaysState, trafficDetailed]);
  async function compareTomTom() { setComparisonLoading(true); setMessage(""); try { const base = import.meta.env.VITE_ROUTING_API_BASE_URL?.trim()?.replace(/\/$/, "") || ""; const response = await fetch(base + "/api/tomtom-route-intelligence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ origin, destination, avoidTolls, avoidHighways }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.message || "TomTom indisponível"); setTomtom(payload); } catch { setMessage("TomTom ainda não está configurado ou não respondeu agora."); } finally { setComparisonLoading(false); } }
  async function compareApple() { setComparisonLoading(true); setMessage(""); try { setApple(await fetchAppleRouteIntelligence({ origin, destination, avoidTolls, avoidHighways })); } catch { setMessage("Apple Maps Server não está configurado ou não respondeu agora."); } finally { setComparisonLoading(false); } }
  const toll = main?.toll?.amount;
  const trafficDelay = main?.durationSeconds != null && main?.staticDurationSeconds != null ? Math.max(0, main.durationSeconds - main.staticDurationSeconds) : null;
  const routeSavings = (route: typeof main) => {
    const base = data?.routes[0] ? totalCost(data.routes[0]) : null;
    const current = totalCost(route);
    return base != null && current != null ? base - current : null;
  };
  const selectDecisionRoute = (mode: "balanced" | "fastest" | "cheapest" | "no-tolls") => {
    if (!data?.routes.length) return;
    const candidates = mode === "no-tolls"
      ? data.routes.filter(route => route.toll?.amount === 0)
      : data.routes;
    const pool = candidates.length ? candidates : data.routes;
    const ranked = [...pool].sort((a, b) => {
      if (mode === "fastest") return Number(a.durationSeconds ?? Infinity) - Number(b.durationSeconds ?? Infinity);
      if (mode === "cheapest") return Number(totalCost(a) ?? Infinity) - Number(totalCost(b) ?? Infinity);
      if (mode === "no-tolls") return Number(a.durationSeconds ?? Infinity) - Number(b.durationSeconds ?? Infinity);
      return Number(b.labels?.includes("FUEL_EFFICIENT") ?? false) - Number(a.labels?.includes("FUEL_EFFICIENT") ?? false);
    });
    if (ranked[0]) onSelectRoute?.(ranked[0].id);
  };

  const routeAnalysis = (route: typeof main, index: number) => {
    if (!route) return { badges: [] as string[], deltaSeconds: null as number | null, savings: null as number | null };
    const base = data?.routes[0];
    const deltaSeconds = base && route.durationSeconds != null && base.durationSeconds != null
      ? route.durationSeconds - base.durationSeconds : null;
    const savings = routeSavings(route);
    const badges: string[] = [];
    if (route.labels?.includes("FUEL_EFFICIENT")) badges.push("mais econômica");
    if (route.labels?.includes("SHORTER_DISTANCE")) badges.push("menor distância");
    if (index > 0 && deltaSeconds != null && deltaSeconds < 0) badges.push("mais rápida");
    if (index > 0 && savings != null && savings > 0) badges.push("menor custo");
    if (route.toll?.amount === 0 && base?.toll?.amount != null && base.toll.amount > 0) badges.push("sem pedágio");
    const tradeoff = deltaSeconds != null && savings != null
      ? deltaSeconds > 0 && savings > 0
        ? `economiza ${savings.toLocaleString("pt-BR", { style: "currency", currency: route.toll?.currency || "BRL" })}, mas leva +${formatDuration(deltaSeconds)}`
        : deltaSeconds < 0 && savings < 0
          ? `ganha ${formatDuration(Math.abs(deltaSeconds))}, mas custa +${Math.abs(savings).toLocaleString("pt-BR", { style: "currency", currency: route.toll?.currency || "BRL" })}`
          : null
      : null;
    return { badges, deltaSeconds, savings, tradeoff };
  };

  return (
    <section aria-labelledby="route-intelligence-title" className="mt-4 rounded-[1.35rem] border border-white/10 bg-[#0D151B] p-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Inteligência da rota</p>
          <h3 id="route-intelligence-title" className="mt-1 text-base font-black">Trânsito, pedágio e alternativas</h3>
          <p className="mt-1 text-[0.65rem] leading-relaxed text-white/45">Dados externos são apresentados como estimativas e não substituem a navegação.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-white/[.07] px-3 text-[0.62rem] font-black disabled:opacity-50">
          <RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> {loading ? "Consultando" : "Atualizar"}
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black">Modo de decisão</p>
            <p className="mt-1 text-[0.58rem] text-white/40">Escolha o objetivo e o Trajeto reaplica a consulta real.</p>
          </div>
          <span className="rounded-full bg-white/[.06] px-2 py-1 text-[0.52rem] font-black text-white/55">{offline ? "offline · cálculos locais" : lastUpdatedAt ? `atualizado ${new Date(lastUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "online · dados reais"}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ["balanced", "Equilibrado"],
            ["fastest", "Mais rápido"],
            ["cheapest", "Menor custo"],
            ["no-tolls", "Sem pedágio"],
          ] as const).map(([mode, label]) => (
            <button key={mode} type="button" aria-pressed={decisionMode === mode} onClick={() => {
              setDecisionMode(mode);
              const nextAvoidTolls = mode === "no-tolls" ? true : mode === "balanced" || mode === "fastest" ? false : avoidTollsState;
              setAvoidTollsState(nextAvoidTolls);
              selectDecisionRoute(mode);
            }} className={"min-h-11 rounded-lg px-2 text-[0.58rem] font-black " + (decisionMode === mode ? "bg-[#C7FF3C] text-[#0B1014]" : "bg-white/[.05] text-white/65")}>{label}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button type="button" aria-pressed={trafficDetailed} onClick={() => setTrafficDetailed(value => !value)} className={"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[0.62rem] font-black " + (trafficDetailed ? "border-[#C7FF3C]/40 bg-[#C7FF3C]/10 text-[#D9FF91]" : "border-white/10 bg-white/[.03] text-white/60")}>
          Trânsito detalhado {trafficDetailed ? "ativado" : "desativado"}
        </button>
        <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.03] px-3 text-[0.58rem] text-white/45">{trafficDetailed ? "NORMAL · SLOW · TRAFFIC_JAM" : "Consulta básica"}</span>
        <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.03] px-3 text-[0.58rem] text-white/45">Cálculo sob demanda</span>
      </div>

      {message && <div role="alert" aria-live="polite" className="mt-3 flex gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-[0.68rem] text-amber-100"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{message}</div>}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button type="button" aria-pressed={avoidTollsState} onClick={() => setAvoidTollsState(value => !value)} className={"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[0.62rem] font-black transition " + (avoidTollsState ? "border-[#C7FF3C]/40 bg-[#C7FF3C]/10 text-[#D9FF91]" : "border-white/10 bg-white/[.03] text-white/60")}>
          <Ban className="size-3.5" /> {avoidTollsState ? "Evitando pedágios" : "Considerar pedágios"}
        </button>
        <button type="button" aria-pressed={avoidHighwaysState} onClick={() => setAvoidHighwaysState(value => !value)} className={"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[0.62rem] font-black transition " + (avoidHighwaysState ? "border-[#3DE3FF]/40 bg-[#3DE3FF]/10 text-[#9FEFFF]" : "border-white/10 bg-white/[.03] text-white/60")}>
          <Route className="size-3.5" /> {avoidHighwaysState ? "Evitando rodovias" : "Considerar rodovias"}
        </button>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 text-[0.62rem] font-black text-white/70 disabled:opacity-50">
          <RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> {loading ? "Atualizando" : "Aplicar cenário"}
        </button>
      </div>

      {loading && !data && (
        <div className="mt-4 grid grid-cols-2 gap-2" role="status" aria-label="Carregando inteligência da rota">
          {[0, 1, 2, 3].map(index => (
            <div key={index} className="min-h-[5.5rem] animate-pulse rounded-xl border border-white/8 bg-white/[.035] p-3">
              <div className="h-3 w-16 rounded bg-white/10" />
              <div className="mt-3 h-5 w-24 rounded bg-white/10" />
              <div className="mt-2 h-2.5 w-20 rounded bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {data && main && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[.04] p-3"><Route className="size-4 text-[#C7FF3C]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Distância</p><strong className="text-sm">{(main.distanceMeters ?? 0) / 1000 < 1 ? "< 1 km" : `${((main.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`}</strong></div>
          <div className="rounded-xl bg-white/[.04] p-3"><Clock3 className="size-4 text-[#3DE3FF]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Com trânsito</p><strong className="text-sm">{formatDuration(main.durationSeconds)}</strong>{trafficDelay != null && trafficDelay > 30 && <p className="mt-1 text-[0.55rem] text-amber-200">+{formatDuration(trafficDelay)} por trânsito</p>}</div>
          <div className="rounded-xl bg-white/[.04] p-3"><Wallet className="size-4 text-[#C7FF3C]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Pedágio</p><strong className="text-sm">{toll != null ? toll.toLocaleString("pt-BR", { style: "currency", currency: main.toll?.currency || "BRL" }) : "Não informado"}</strong>{main.toll?.estimated && <p className="mt-1 text-[0.52rem] text-amber-200">estimado</p>}</div>
          <div className="rounded-xl bg-white/[.04] p-3"><Car className="size-4 text-[#BDA5FF]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Alternativas</p><strong className="text-sm">{Math.max(0, data.routes.length - 1)} {Math.max(0, data.routes.length - 1) === 1 ? "alternativa" : "alternativas"}</strong><p className="mt-1 text-[0.52rem] text-white/35">{data.trafficAware ? "trânsito considerado" : "trânsito básico"}</p></div>
        </div>
      )}

      {data && main && (
        <div className="mt-3 rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.035] p-3.5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><Route className="size-4" /></span>
            <div className="min-w-0">
              <p className="text-[0.55rem] font-black uppercase tracking-[.14em] text-[#C7FF3C]">Decisão da viagem</p>
              <p className="mt-1 text-sm font-black">{trafficDelay != null && trafficDelay > 120 ? "Reserve margem: o trânsito está adicionando tempo à rota." : totalCost(main) != null ? "Custo estimado do percurso: " + totalCost(main)!.toLocaleString("pt-BR", { style: "currency", currency: main.toll?.currency || "BRL" }) + "." : toll != null ? "Pedágio informado; complete o combustível para estimar o custo total." : "Confira tempo, distância e dados de custo antes de sair."}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[0.52rem] font-bold text-white/45">
                <span className="rounded-full bg-white/[.05] px-2 py-1">{formatDuration(main.durationSeconds)} de percurso</span>
                {trafficDelay != null && trafficDelay > 0 && <span className="rounded-full bg-white/[.05] px-2 py-1">+{formatDuration(trafficDelay)} trânsito</span>}
                {toll != null && <span className="rounded-full bg-white/[.05] px-2 py-1">pedágio {toll.toLocaleString("pt-BR", { style: "currency", currency: main.toll?.currency || "BRL" })}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {data && <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-black">Custo da viagem</p><p className="mt-1 text-[0.58rem] text-white/40">{vehicle ? `${vehicle.name} · ${vehicle.consumption.toLocaleString("pt-BR")} km/L` : "Cadastre o veículo para calcular combustível."}</p></div>
          <label className="flex items-center gap-1 text-[0.58rem] text-white/50">R$/L<input aria-label="Preço do combustível por litro" inputMode="decimal" value={fuelPrice || ""} onChange={event => { const value = Number(event.target.value.replace(",", ".")); setFuelPrice(Number.isFinite(value) ? value : 0); try { localStorage.setItem("trajeto-route-fuel-price", String(value)); } catch {} }} className="w-20 rounded-lg border border-white/10 bg-white/[.06] px-2 py-2 text-xs font-black text-white outline-none" placeholder="0,00" /></label>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
          {data.routes.slice(0, 4).map((route, index) => <div key={"cost-" + route.id} className="min-w-[13rem] snap-start rounded-xl bg-white/[.04] p-3 sm:min-w-0"><p className="text-[0.52rem] uppercase text-white/35">{index === 0 ? "Principal" : "Alternativa " + index}</p><p className="mt-1 text-[0.62rem] text-white/50">{formatDuration(route.durationSeconds)} · {((route.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p><strong className="mt-1 block text-sm">{totalCost(route) != null ? totalCost(route)!.toLocaleString("pt-BR", { style: "currency", currency: route.toll?.currency || "BRL" }) : fuelCost(route) == null ? "Combustível não calculado" : route.toll?.amount == null ? "Pedágio não informado" : "Custo indisponível"}</strong>{routeSavings(route) != null && routeSavings(route)! > 0 && <p className="mt-1 text-[0.58rem] font-black text-[#C7FF3C]">Economia potencial de {routeSavings(route)!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} vs. principal</p>}<p className="mt-1 text-[0.55rem] text-white/35">{fuelCost(route) != null ? `Combustível ${fuelCost(route)!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "Combustível não calculado"} · Pedágio {route.toll?.amount != null ? route.toll.amount.toLocaleString("pt-BR", { style: "currency", currency: route.toll.currency }) : "não informado"}{route.toll?.estimated ? " · estimado" : ""}</p></div>)}
        </div>
      </div>}

      {data && data.routes.length > 0 && (
        <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black">Simulador de decisão</p>
              <p className="mt-1 text-[0.58rem] text-white/40">Escolha um critério. O Trajeto aplica somente aos dados reais retornados.</p>
            </div>
            <span className="rounded-full bg-white/[.06] px-2 py-1 text-[0.5rem] font-black text-white/45">sem rota inventada</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["rápida", "Mais rápida", (routes: typeof data.routes, r: typeof data.routes[number]) => (r.durationSeconds ?? Infinity), "menor duração"],
              ["custo", "Menor custo", (routes: typeof data.routes, r: typeof data.routes[number]) => totalCost(r), "combustível + pedágio"],
              ["distância", "Menor distância", (routes: typeof data.routes, r: typeof data.routes[number]) => r.distanceMeters, "distância total"],
              ["pedágio", "Menor pedágio", (routes: typeof data.routes, r: typeof data.routes[number]) => r.toll?.amount, "valor informado"],
            ].map(([key, label, metric, hint]) => {
              const ranked = data.routes.filter(route => metric(data.routes, route) != null);
              const route = ranked.length ? [...ranked].sort((a, b) => Number(metric(data.routes, a)) - Number(metric(data.routes, b)))[0] : data.routes[0];
              const active = selectedRouteId === route.id;
              return <button key={String(key)} type="button" onClick={() => onSelectRoute?.(route.id)} className={"min-h-11 rounded-xl border px-2 text-left " + (active ? "border-[#C7FF3C]/40 bg-[#C7FF3C]/10" : "border-white/8 bg-white/[.025]")}>
                <span className="block text-[0.52rem] font-black uppercase text-white/35">{String(label)}</span>
                <span className="mt-1 block text-[0.62rem] font-black">{route.id === "principal" ? "Principal" : route.id.replace("alternativa-", "Alternativa ")}</span>
                <span className="mt-1 block text-[0.48rem] text-white/35">{String(hint)}</span>
              </button>;
            })}
          </div>
          <div className="mt-3 rounded-xl border border-white/6 bg-black/10 p-3 text-[0.58rem] leading-relaxed text-white/45">
            <p><strong className="text-white/70">Combustível:</strong> distância ÷ km/L × preço/L.</p>
            <p className="mt-1"><strong className="text-white/70">Custo da viagem:</strong> combustível + pedágio informado.</p>
            <p className="mt-1"><strong className="text-white/70">Comparação:</strong> tempo, distância, pedágio e custo são avaliados separadamente.</p>
          </div>
        </div>
      )}

      {data && data.routes.length > 1 && selectedRouteId && (
        <div className="mt-3 rounded-2xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[.025] p-3.5">
          <p className="text-[0.55rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">O que muda ao escolher esta rota</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(() => {
              const selected = data.routes.find(route => route.id === selectedRouteId) ?? data.routes[0];
              const base = data.routes[0];
              const timeDelta = selected.durationSeconds != null && base.durationSeconds != null ? selected.durationSeconds - base.durationSeconds : null;
              const distanceDelta = selected.distanceMeters != null && base.distanceMeters != null ? selected.distanceMeters - base.distanceMeters : null;
              const costDelta = routeSavings(selected);
              return <>
                <div className="rounded-xl bg-white/[.04] p-3"><p className="text-[0.52rem] uppercase tracking-[.1em] text-white/35">Tempo</p><p className="mt-1 text-sm font-black">{timeDelta == null ? "—" : timeDelta === 0 ? "igual" : (timeDelta > 0 ? "+" : "") + formatDuration(Math.abs(timeDelta))}</p><p className="mt-1 text-[0.52rem] text-white/35">vs. principal</p></div>
                <div className="rounded-xl bg-white/[.04] p-3"><p className="text-[0.52rem] uppercase tracking-[.1em] text-white/35">Distância</p><p className="mt-1 text-sm font-black">{distanceDelta == null ? "—" : distanceDelta === 0 ? "igual" : (distanceDelta > 0 ? "+" : "") + (Math.abs(distanceDelta) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km"}</p><p className="mt-1 text-[0.52rem] text-white/35">vs. principal</p></div>
                <div className="col-span-2 rounded-xl bg-white/[.04] p-3"><p className="text-[0.52rem] uppercase tracking-[.1em] text-white/35">Custo</p><p className="mt-1 text-sm font-black">{costDelta == null ? "não comparável" : costDelta === 0 ? "igual" : (costDelta > 0 ? "+" : "−") + Math.abs(costDelta).toLocaleString("pt-BR", { style: "currency", currency: selected.toll?.currency || "BRL" })}</p><p className="mt-1 text-[0.52rem] text-white/35">{costDelta == null ? "faltam dados de combustível ou pedágio" : costDelta < 0 ? "economia estimada vs. principal" : "acréscimo estimado vs. principal"}</p></div>
              </>;
            })()}
          </div>
        </div>
      )}

      {data && data.routes.length > 1 && (
        <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
          <p className="text-xs font-black">Escolha a rota no mapa</p>
          <p className="mt-1 text-[0.58rem] text-white/40">Selecione uma alternativa para destacar o caminho real antes de navegar.</p>
          <div className="mt-3 space-y-2">
            {data.routes.slice(0, 4).map((route, index) => {
              const analysis = routeAnalysis(route, index);
              const selected = selectedRouteId === route.id;
              return (
                <div key={route.id} className={"w-full rounded-xl border p-3 transition " + (selected ? "border-[#C7FF3C]/50 bg-[#C7FF3C]/[.08]" : "border-white/8 bg-white/[.025]")}>
                  <button type="button" aria-pressed={selected} onClick={() => onSelectRoute?.(route.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black">{index === 0 ? "Principal" : `Alternativa ${index}`}</p>
                        <p className="mt-1 text-[0.58rem] text-white/45">{formatDuration(route.durationSeconds)} · {((route.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p>
                      </div>
                      <strong className="text-sm">{totalCost(route) == null ? "Custo incompleto" : totalCost(route)!.toLocaleString("pt-BR", { style: "currency", currency: route.toll?.currency || "BRL" })}</strong>
                    </div>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {analysis.badges.map(badge => <span key={badge} className="rounded-full bg-white/[.07] px-2 py-1 text-[0.52rem] font-black text-white/65">{badge}</span>)}{trafficDetailed && route.trafficImpact && route.trafficImpact.totalPoints > 0 && <span className="rounded-full bg-white/[.07] px-2 py-1 text-[0.52rem] font-black text-white/55">impacto {(route.trafficImpact.affectedPoints / route.trafficImpact.totalPoints * 100).toFixed(0)}% da polyline</span>}
                    {analysis.deltaSeconds != null && index > 0 && <span className="rounded-full bg-white/[.07] px-2 py-1 text-[0.52rem] font-black text-white/55">{analysis.deltaSeconds > 0 ? "+" : ""}{formatDuration(analysis.deltaSeconds)} vs principal</span>}
                    {analysis.tradeoff && <span className="w-full text-[0.55rem] leading-relaxed text-white/45">{analysis.tradeoff}</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[0.54rem] font-bold text-white/40">{selected ? "Prévia destacada no mapa" : "Toque para visualizar no mapa"}</p>
                    {selected && <button type="button" onClick={() => onConfirmRoute?.(route.id)} className="min-h-9 rounded-lg bg-[#C7FF3C] px-3 text-[0.58rem] font-black text-[#0B1014]">Usar esta rota</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data && <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
        <p className="text-xs font-black">Navegar agora</p>
        <p className="mt-1 text-[0.58rem] text-white/40">
          {routeConfirmed
            ? <>Rota confirmada: {selectedRouteId === "principal" ? "principal" : selectedRouteId.replace("alternativa-", "alternativa ")}. O navegador externo pode recalcular o caminho.</>
            : "Confirme “Usar esta rota” para liberar a navegação externa."}
        </p>
        {routeConfirmed && <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(origin, destination, "driving", waypoints), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl bg-[#C7FF3C] px-2 text-[0.62rem] font-black text-[#0B1014]">Google Maps</button>
          <button type="button" onClick={() => window.open(buildWazeNavigationUrl(destination), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl bg-white/[.07] px-2 text-[0.62rem] font-black">Waze</button>
          <button type="button" onClick={() => window.open(buildAppleMapsDirectionsUrl(destination, origin, avoidTolls ? "avoid-tolls" : avoidHighways ? "avoid-highways" : "default", waypoints), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl bg-white/[.07] px-2 text-[0.62rem] font-black">Apple Maps</button>
        </div>}
      </div>}

      {data && (
        <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black">Comparar provedores</p>
              <p className="mt-1 text-[0.58rem] text-white/40">Consulta opcional. Não altera a rota selecionada.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={compareApple} disabled={comparisonLoading} className="min-h-10 rounded-lg bg-white/[.07] px-3 text-[0.62rem] font-black disabled:opacity-50">
                Apple
              </button>
              <button type="button" onClick={compareTomTom} disabled={comparisonLoading} className="min-h-10 rounded-lg bg-white/[.07] px-3 text-[0.62rem] font-black disabled:opacity-50">
                TomTom
              </button>
            </div>
          </div>
          {(apple?.routes?.[0] || tomtom?.routes?.[0]) && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/[.04] p-2.5">
                <p className="text-[0.52rem] uppercase text-white/35">Google</p>
                <strong className="text-xs">{formatDuration(main?.durationSeconds ?? null)} · {((main?.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</strong>
              </div>
              <div className="rounded-lg bg-white/[.04] p-2.5">
                <p className="text-[0.52rem] uppercase text-white/35">Apple</p>
                <strong className="text-xs">{apple?.routes?.[0] ? formatDuration(apple.routes[0].durationSeconds) : "não consultado"}</strong>
              </div>
              <div className="rounded-lg bg-white/[.04] p-2.5">
                <p className="text-[0.52rem] uppercase text-white/35">TomTom</p>
                <strong className="text-xs">{tomtom?.routes?.[0] ? formatDuration(tomtom.routes[0].durationSeconds) : "não consultado"}</strong>
              </div>
            </div>
          )}
        </div>
      )}


      {data && (
        <details className="mt-3 rounded-xl border border-white/8 bg-white/[.02] p-3">
          <summary className="cursor-pointer text-[0.62rem] font-black">Como o cálculo funciona</summary>
          <div className="mt-2 space-y-1 text-[0.57rem] leading-relaxed text-white/45">
            <p><strong className="text-white/65">Combustível:</strong> distância ÷ consumo × preço por litro.</p>
            <p><strong className="text-white/65">Custo total:</strong> combustível + pedágio informado pela fonte.</p>
            <p><strong className="text-white/65">Impacto do trânsito:</strong> duração com trânsito − duração estática, quando ambas existem.</p>
            <p><strong className="text-white/65">Economia:</strong> custo da rota principal − custo da alternativa.</p>
            <p>Sem preço ou dado externo disponível, o Trajeto mostra “não informado” em vez de estimar.</p>
          </div>
        </details>
      )}

      <p className="mt-3 text-[0.56rem] leading-relaxed text-white/35">Fonte avançada: Google Routes API. Quando a fonte não retornar preço de pedágio, o Trajeto informa “não informado” em vez de estimar sem base.</p>
    </section>
  );
}
