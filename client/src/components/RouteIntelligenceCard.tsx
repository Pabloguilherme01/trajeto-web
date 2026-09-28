import { useState } from "react";
import { AlertTriangle, Car, Clock3, RefreshCw, Route, Wallet } from "lucide-react";
import { fetchRouteIntelligence, type RouteIntelligence } from "@/lib/routeIntelligence";
import { fetchAppleRouteIntelligence, type AppleRouteIntelligence } from "@/lib/appleRouteIntelligence";
import { getMobileVehicle } from "@/lib/mobileVehicle";

type Props = {
  origin: string;
  destination: string;
  waypoints?: string[];
  avoidTolls?: boolean;
  avoidHighways?: boolean;
};

function formatDuration(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export default function RouteIntelligenceCard({ origin, destination, waypoints = [], avoidTolls, avoidHighways }: Props) {
  const [data, setData] = useState<RouteIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [apple, setApple] = useState<AppleRouteIntelligence | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);\n  const [tomtom, setTomtom] = useState<{ routes: Array<{ distanceMeters: number | null; durationSeconds: number | null; trafficDelaySeconds: number | null }> } | null>(null);
  const [fuelPrice, setFuelPrice] = useState(() => { try { return Number(localStorage.getItem("trajeto-route-fuel-price") || 0); } catch { return 0; } });
  const vehicle = getMobileVehicle();

  async function refresh() {
    setLoading(true);
    setMessage("");
    try {
      setData(await fetchRouteIntelligence({ origin, destination, waypoints, avoidTolls, avoidHighways }));
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
  async function compareTomTom() { setComparisonLoading(true); setMessage(""); try { const base = import.meta.env.VITE_ROUTING_API_BASE_URL?.trim()?.replace(/\\/$/, "") || ""; const response = await fetch(base + "/api/tomtom-route-intelligence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ origin, destination, avoidTolls, avoidHighways }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.message || "TomTom indisponível"); setTomtom(payload); } catch { setMessage("TomTom ainda não está configurado ou não respondeu agora."); } finally { setComparisonLoading(false); } }\n  async function compareApple() { setComparisonLoading(true); setMessage(""); try { setApple(await fetchAppleRouteIntelligence({ origin, destination, avoidTolls, avoidHighways })); } catch { setMessage("Apple Maps Server não está configurado ou não respondeu agora."); } finally { setComparisonLoading(false); } }
  const toll = main?.toll?.amount;
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

      {data && main && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[.04] p-3"><Route className="size-4 text-[#C7FF3C]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Rota principal</p><strong className="text-sm">{(main.distanceMeters ?? 0) / 1000 < 1 ? "< 1 km" : `${((main.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`}</strong></div>
          <div className="rounded-xl bg-white/[.04] p-3"><Clock3 className="size-4 text-[#3DE3FF]" /><p className="mt-2 text-[0.55rem] uppercase tracking-wider text-white/40">Com trânsito</p><strong className="text-sm">{formatDuration(main.durationSeconds)}</strong></div>
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
          {data.routes.slice(0, 4).map((route, index) => <div key={"cost-" + route.id} className="rounded-xl bg-white/[.04] p-3"><p className="text-[0.52rem] uppercase text-white/35">{index === 0 ? "Principal" : "Alternativa " + index}</p><p className="mt-1 text-[0.62rem] text-white/50">{formatDuration(route.durationSeconds)} · {((route.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p><strong className="mt-1 block text-sm">{totalCost(route) == null ? "Informe combustível" : totalCost(route)!.toLocaleString("pt-BR", { style: "currency", currency: route.toll?.currency || "BRL" })}</strong><p className="mt-1 text-[0.55rem] text-white/35">{fuelCost(route) != null ? `Combustível ${fuelCost(route)!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "Combustível não calculado"} · Pedágio {route.toll?.amount != null ? route.toll.amount.toLocaleString("pt-BR", { style: "currency", currency: route.toll.currency }) : "não informado"}</p></div>)}
        </div>
      </div>}

      {data && <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black">Comparar provedores</p><p className="mt-1 text-[0.58rem] text-white/40">Google Routes × Apple Maps Server × TomTom.</p></div><button type="button" onClick={compareApple} disabled={comparisonLoading} className="min-h-10 rounded-lg bg-white/[.07] px-3 text-[0.62rem] font-black disabled:opacity-50">{comparisonLoading ? "Consultando" : "Comparar"}</button><button type="button" onClick={compareTomTom} disabled={comparisonLoading} className="min-h-10 rounded-lg bg-white/[.07] px-3 text-[0.62rem] font-black disabled:opacity-50">TomTom</button></div>{(apple?.routes?.[0] || tomtom?.routes?.[0]) && <div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-white/[.04] p-2.5"><p className="text-[0.52rem] uppercase text-white/35">Google</p><strong className="text-xs">{formatDuration(main?.durationSeconds ?? null)} · {((main?.distanceMeters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</strong></div><div className="rounded-lg bg-white/[.04] p-2.5"><p className="text-[0.52rem] uppercase text-white/35">Apple</p><strong className="text-xs">{apple?.routes?.[0] ? formatDuration(apple.routes[0].durationSeconds) : "não consultado"}</strong></div><div className="rounded-lg bg-white/[.04] p-2.5"><p className="text-[0.52rem] uppercase text-white/35">TomTom</p><strong className="text-xs">{tomtom?.routes?.[0] ? formatDuration(tomtom.routes[0].durationSeconds) : "não consultado"}</strong></div></div>}</div>}

      {data && data.routes.length > 1 && (
        <div className="mt-3 space-y-2">
          {data.routes.slice(0, 3).map((route, index) => (
            <div key={route.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2.5">
              <span className="text-xs font-black">{index === 0 ? "Principal" : `Alternativa ${index}`}</span>
              <span className="text-[0.65rem] text-white/55">{formatDuration(route.durationSeconds)} · {route.toll?.amount != null ? route.toll.amount.toLocaleString("pt-BR", { style: "currency", currency: route.toll.currency }) : "pedágio não informado"}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[0.56rem] leading-relaxed text-white/35">Fonte avançada: Google Routes API. Quando a fonte não retornar preço de pedágio, o Trajeto informa “não informado” em vez de estimar sem base.</p>
    </section>
  );
}
