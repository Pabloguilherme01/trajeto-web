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
  onRoutesChange?: (routes: RouteIntelligence["routes"]) => void;
};

function formatDuration(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export default function RouteIntelligenceCard({ origin, destination, waypoints = [], avoidTolls, avoidHighways, selectedRouteId = "principal", onSelectRoute, onRoutesChange }: Props) {
  const [data, setData] = useState<RouteIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [apple, setApple] = useState<AppleRouteIntelligence | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [avoidTollsState, setAvoidTollsState] = useState(Boolean(avoidTolls));
  const [avoidHighwaysState, setAvoidHighwaysState] = useState(Boolean(avoidHighways));
  const [tomtom, setTomtom] = useState<{ routes: Array<{ distanceMeters: number | null; durationSeconds: number | null; trafficDelaySeconds: number | null }> } | null>(null);
  const [fuelPrice, setFuelPrice] = useState(() => { try { return Number(localStorage.getItem("trajeto-route-fuel-price") || 0); } catch { return 0; } });
  const vehicle = getMobileVehicle();

  async function refresh() {
    setLoading(true);
    setMessage("");
    try {
      const nextData = await fetchRouteIntelligence({ origin, destination, waypoints, avoidTolls: avoidTollsState, avoidHighways: avoidHighwaysState });
      setData(nextData);
      onRoutesChange?.(nextData.routes);
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
  useEffect(() => { void refresh(); }, [origin, destination, waypoints.join("|"), avoidTollsState, avoidHighwaysState]);
  async function compareTomTom() { setComparisonLoading(true); setMessage(""); try { const base = import.meta.env.VITE_ROUTING_API_BASE_URL?.trim()?.replace(/\/$/, "") || ""; const response = await fetch(base + "/api/tomtom-route-intelligence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ origin, destination, avoidTolls, avoidHighways }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.message || "TomTom indisponível"); setTomtom(payload); } catch { setMessage("TomTom ainda não está configurado ou não respondeu agora."); } finally { setComparisonLoading(false); } }
  async function compareApple() { setComparisonLoading(true); setMessage(""); try { setApple(await fetchAppleRouteIntelligence({ origin, destination, avoidTolls, avoidHighways })); } catch { setMessage("Apple Maps Server não está configurado ou não respondeu agora."); } finally { setComparisonLoading(false); } }
  const toll = main?.toll?.amount;
  const trafficDelay = main?.durationSeconds != null && main?.staticDurationSeconds != null ? Math.max(0, main.durationSeconds - main.staticDurationSeconds) : null;
  const fuelCost = (route: typeof main) => {
    if (!route || !fuelPrice) return null;
    if (route.fuelConsumptionLiters != null && route.fuelConsumptionLiters > 0) return route.fuelConsumptionLiters * fuelPrice;
    if (!vehicle || vehicle.consumption <= 0 || !route.distanceMeters) return null;
    return (route.distanceMeters / 1000 / vehicle.consumption) * fuelPrice;
  };
  const totalCost = (route: typeof main) => {
    if (!route) return null;
    const fuel = fuelCost(route);
    const routeToll = route.toll?.amount ?? 0;
    return fuel == null && route.toll?.amount == null ? null : (fuel ?? 0) + routeToll;
  };

  const routeSavings = (route: typeof main) => {
    const base = data?.routes[0] ? totalCost(data.routes[0]) : null;
    const current = totalCost(route);
    return base != null && current != null ? base - current : null;
  };
  useEffect(() => { if (data?.routes.length) onRoutesChange?.(data.routes); }, [data]);
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
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-white/[.07] px-3 text-[0.62rem] font-black disabled:opacity-50">
          <RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> {loading ? "Consultando" : "Atualizar"}
        </button>
      </div>

      {message && <div className="mt-3 flex gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-[0.68rem] text-amber-100"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{message}</div>}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button type="button" aria-pressed={avoidTollsState} onClick={() => setAvoidTollsState(value => !value)} className={"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[0.62rem] font-black transition " + (avoidTollsState ? "border-[#C7FF3C]/40 bg-[#C7FF3C]/10 text-[#D9FF91]" : "border-white/10 bg-white/[.03] text-white/60")}>
          <Ban className="size-3.5" /> {avoidTollsState ? "Evitando pedágios" : "Considerar pedágios"}
        </button>
        <button type="button" aria-pressed={avoidHighwaysState} onClick={() => setAvoidHighwaysState(value => !value)} className={"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[0.62rem] font-black transition " + (avoidHighwaysState ? "border-[#3DE3FF]/40 bg-[#3DE3FF]/10 text-[#9FEFFF]" : "border-white/10 bg-white/[.03] text-white/60")}>
          <Route className="size-3.5" /> {avoidHighwaysState ? "Evitando rodovias" : "Considerar rodovias"}
        </button>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 text-[0.62rem] font-black text-white/70 disabled:opacity-50">
          <RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> {loading ? "Atualizando" : "Aplicar cenário"}
        </button>
      </div>

      {data && main && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[.04] p-3"><Route className="size-4 text-[#C7FF3C]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Rota principal</p><strong className="text-sm">{(main.distanceMeters ?? 0) / 1000 < 1 ? "< 1 km" : `${((main.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`}</strong></div>
          <div className="rounded-xl bg-white/[.04] p-3"><Clock3 className="size-4 text-[#3DE3FF]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Com trânsito</p><strong className="text-sm">{formatDuration(main.durationSeconds)}</strong>{trafficDelay != null && trafficDelay > 30 && <p className="mt-1 text-[0.55rem] text-amber-200">+{formatDuration(trafficDelay)} por trânsito</p>}</div>
          <div className="rounded-xl bg-white/[.04] p-3"><Wallet className="size-4 text-[#C7FF3C]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Pedágio</p><strong className="text-sm">{toll != null ? toll.toLocaleString("pt-BR", { style: "currency", currency: main.toll?.currency || "BRL" }) : "Não informado"}</strong></div>
          <div className="rounded-xl bg-white/[.04] p-3"><Car className="size-4 text-[#BDA5FF]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Alternativas</p><strong className="text-sm">{Math.max(0, data.routes.length - 1)} disponível(is)</strong></div>
        </div>
      )}

      {data && <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-black">Custo da viagem</p><p className="mt-1 text-[0.58rem] text-white/40">{vehicle ? `${vehicle.name} · ${vehicle.consumption.toLocaleString("pt-BR")} km/L` : "Cadastre o veículo para calcular combustível."}</p></div>
          <label className="flex items-center gap-1 text-[0.58rem] text-white/50">R$/L<input aria-label="Preço do combustível por litro" inputMode="decimal" value={fuelPrice || ""} onChange={event => { const value = Number(event.target.value.replace(",", ".")); setFuelPrice(Number.isFinite(value) ? value : 0); try { localStorage.setItem("trajeto-route-fuel-price", String(value)); } catch {} }} className="w-20 rounded-lg border border-white/10 bg-white/[.06] px-2 py-2 text-xs font-black text-white outline-none" placeholder="0,00" /></label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {data.routes.slice(0, 4).map((route, index) => <div key={"cost-" + route.id} className="rounded-xl bg-white/[.04] p-3"><p className="text-[0.52rem] uppercase text-white/35">{index === 0 ? "Principal" : "Alternativa " + index}</p><p className="mt-1 text-[0.62rem] text-white/50">{formatDuration(route.durationSeconds)} · {((route.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p><strong className="mt-1 block text-sm">{totalCost(route) == null ? "Informe combustível" : totalCost(route)!.toLocaleString("pt-BR", { style: "currency", currency: route.toll?.currency || "BRL" })}</strong>{routeSavings(route) != null && routeSavings(route)! > 0 && <p className="mt-1 text-[0.58rem] font-black text-[#C7FF3C]">Economia potencial de {routeSavings(route)!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} vs. principal</p>}<p className="mt-1 text-[0.55rem] text-white/35">{fuelCost(route) != null ? `Combustível ${fuelCost(route)!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "Combustível não calculado"} · Pedágio {route.toll?.amount != null ? route.toll.amount.toLocaleString("pt-BR", { style: "currency", currency: route.toll.currency }) : "não informado"}</p></div>)}
        </div>
      </div>}

      {data && data.routes.length > 1 && (
        <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
          <p className="text-xs font-black">Escolha a rota no mapa</p>
          <p className="mt-1 text-[0.58rem] text-white/40">Selecione uma alternativa para destacar o caminho real antes de navegar.</p>
          <div className="mt-3 space-y-2">
            {data.routes.slice(0, 4).map((route, index) => {
              const analysis = routeAnalysis(route, index);
              const selected = selectedRouteId === route.id;
              return <button key={route.id} type="button" aria-pressed={selected} onClick={() => onSelectRoute?.(route.id)} className={"w-full rounded-xl border p-3 text-left transition " + (selected ? "border-[#C7FF3C]/50 bg-[#C7FF3C]/[.08]" : "border-white/8 bg-white/[.025] hover:border-white/20")}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-black">{index === 0 ? "Principal" : `Alternativa ${index}`}</p><p className="mt-1 text-[0.58rem] text-white/45">{formatDuration(route.durationSeconds)} · {((route.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p></div>
                  <strong className="text-sm">{totalCost(route) == null ? "Custo parcial" : totalCost(route)!.toLocaleString("pt-BR", { style: "currency", currency: route.toll?.currency || "BRL" })}</strong>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysis.badges.map(badge => <span key={badge} className="rounded-full bg-white/[.07] px-2 py-1 text-[0.52rem] font-black text-white/65">{badge}</span>)}
                  {analysis.deltaSeconds != null && index > 0 && <span className="rounded-full bg-white/[.07] px-2 py-1 text-[0.52rem] font-black text-white/55">{analysis.deltaSeconds > 0 ? "+" : ""}{formatDuration(analysis.deltaSeconds)} vs principal</span>}
                  {analysis.tradeoff && <span className="w-full text-[0.55rem] leading-relaxed text-white/45">{analysis.tradeoff}</span>}
                </div>
                <p className="mt-2 text-[0.54rem] font-bold text-white/40">{selected ? "Prévia selecionada no mapa" : "Toque para visualizar no mapa"}</p>
              </button>;
            })}
          </div>
        </div>
      )}

      {data && <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3"><p className="text-xs font-black">Navegar agora</p><p className="mt-1 text-[0.58rem] text-white/40">Rota selecionada: {selectedRouteId === "principal" ? "principal" : selectedRouteId.replace("alternativa-", "alternativa ")}. O navegador externo pode recalcular o caminho.</p><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={() => window.open(buildGoogleMapsDirectionsUrl(origin, destination, "driving", waypoints), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl bg-[#C7FF3C] px-2 text-[0.62rem] font-black text-[#0B1014]">Google Maps</button><button type="button" onClick={() => window.open(buildWazeNavigationUrl(destination), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl bg-white/[.07] px-2 text-[0.62rem] font-black">Waze</button><button type="button" onClick={() => window.open(buildAppleMapsDirectionsUrl(destination, origin, avoidTolls ? "avoid-tolls" : avoidHighways ? "avoid-highways" : "default", waypoints), "_blank", "noopener,noreferrer")} className="min-h-11 rounded-xl bg-white/[.07] px-2 text-[0.62rem] font-black">Apple Maps</button></div></div>

      {data && <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black">Comparar provedores</p><p className="mt-1 text-[0.58rem] text-white/40">Google Routes × Apple Maps Server × TomTom.</p></div><button type="button" onClick={compareApple} disabled={comparisonLoading} className="min-h-10 rounded-lg bg-white/[.07] px-3 text-[0.62rem] font-black disabled:opacity-50">{comparisonLoading ? "Consultando" : "Comparar"}</button><button type="button" onClick={compareTomTom} disabled={comparisonLoading} className="min-h-10 rounded-lg bg-white/[.07] px-3 text-[0.62rem] font-black disabled:opacity-50">TomTom</button></div>{(apple?.routes?.[0] || tomtom?.routes?.[0]) && <div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-white/[.04] p-2.5"><p className="text-[0.52rem] uppercase text-white/35">Google</p><strong className="text-xs">{formatDuration(main?.durationSeconds ?? null)} · {((main?.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</strong></div><div className="rounded-lg bg-white/[.04] p-2.5"><p className="text-[0.52rem] uppercase text-white/35">Apple</p><strong className="text-xs">{apple?.routes?.[0] ? formatDuration(apple.routes[0].durationSeconds) : "não consultado"}</strong></div><div className="rounded-lg bg-white/[.04] p-2.5"><p className="text-[0.52rem] uppercase text-white/35">TomTom</p><strong className="text-xs">{tomtom?.routes?.[0] ? formatDuration(tomtom.routes[0].durationSeconds) : "não consultado"}</strong></div></div>}</div>}

      {data && data.routes.length > 1 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Mais rápida", route: data.routes.reduce((best, route) => route.durationSeconds != null && (best.durationSeconds == null || route.durationSeconds < best.durationSeconds) ? route : best, data.routes[0]) },
            { label: "Menor custo", route: data.routes.reduce((best, route) => {
              const cost = totalCost(route); const bestCost = totalCost(best);
              return cost != null && (bestCost == null || cost < bestCost) ? route : best;
            }, data.routes[0]) },
            { label: "Sem pedágio", route: data.routes.find(route => route.toll?.amount === 0) || null },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-white/8 bg-white/[.025] p-3">
              <p className="text-[0.52rem] font-black uppercase tracking-wider text-white/35">{item.label}</p>
              <p className="mt-1 text-xs font-black">{item.route ? (item.route.id === "principal" ? "Principal" : item.route.id.replace("alternativa-", "Alternativa ")) : "Não comprovado"}</p>
              {item.route && <p className="mt-1 text-[0.55rem] text-white/45">{formatDuration(item.route.durationSeconds)} · {item.route.toll?.amount != null ? item.route.toll.amount.toLocaleString("pt-BR", { style: "currency", currency: item.route.toll.currency }) : "pedágio não informado"}</p>}
            </div>
          ))}
        </div>
      )}

      {data && data.routes.length > 1 && (
        <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
          <div className="mb-3">
            <p className="text-xs font-black">Escolha da alternativa</p>
            <p className="mt-1 text-[0.58rem] text-white/40">Compare o impacto antes de abrir o navegador.</p>
          </div>
          <div className="space-y-2">
            {data.routes.slice(0, 4).map((route, index) => {
              const analysis = routeAnalysis(route, index);
              return (
                <button type="button" onClick={() => onSelectRoute?.(route.id)} aria-pressed={selectedRouteId === route.id} className={"w-full text-left rounded-xl border p-3 transition " + (selectedRouteId === route.id ? "border-[#BA5B45]/60 bg-[#BA5B45]/[.08]" : "border-white/8 bg-white/[.025]")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">{index === 0 ? "Principal" : `Alternativa ${index}`}</p>
                      <p className="mt-1 text-[0.58rem] text-white/45">{formatDuration(route.durationSeconds)} · {((route.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p>
                    </div>
                    <strong className="text-sm">{totalCost(route) == null ? "Custo parcial" : totalCost(route)!.toLocaleString("pt-BR", { style: "currency", currency: route.toll?.currency || "BRL" })}</strong>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {analysis.badges.map(badge => <span key={badge} className="rounded-full bg-white/[.07] px-2 py-1 text-[0.52rem] font-black text-white/65">{badge}</span>)}
                    {analysis.deltaSeconds != null && index > 0 && <span className="rounded-full bg-white/[.07] px-2 py-1 text-[0.52rem] font-black text-white/55">{analysis.deltaSeconds > 0 ? "+" : ""}{formatDuration(analysis.deltaSeconds)} vs principal</span>}
                    {analysis.tradeoff && <span className="w-full text-[0.55rem] leading-relaxed text-white/45">{analysis.tradeoff}</span>}
                    {route.toll?.amount != null && <span className="rounded-full bg-white/[.07] px-2 py-1 text-[0.52rem] font-black text-white/55">pedágio {route.toll.amount.toLocaleString("pt-BR", { style: "currency", currency: route.toll.currency })}</span>}
                  </div>
                </div>
                  <p className="mt-2 text-[0.54rem] font-bold text-white/40">{selectedRouteId === route.id ? "Prévia selecionada no mapa" : "Toque para ver esta rota no mapa"}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 text-[0.56rem] leading-relaxed text-white/35">Fonte avançada: Google Routes API. Quando a fonte não retornar preço de pedágio, o Trajeto informa “não informado” em vez de estimar sem base.</p>
    </section>
  );
}
