import { useState } from "react";
import { AlertTriangle, Car, Clock3, RefreshCw, Route, Wallet } from "lucide-react";
import { fetchRouteIntelligence, type RouteIntelligence } from "@/lib/routeIntelligence";

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
  const toll = main?.toll?.amount;

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
