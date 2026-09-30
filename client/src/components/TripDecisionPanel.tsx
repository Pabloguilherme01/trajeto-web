import { AlertTriangle, CheckCircle2, Clock3, Fuel, Route as RouteIcon, ShieldCheck } from "lucide-react";
import type { RouteIntelligenceRoute } from "@/lib/routeIntelligence";
import { getMobileVehicle } from "@/lib/mobileVehicle";

type Props = { route: RouteIntelligenceRoute | null; alternatives: RouteIntelligenceRoute[]; online: boolean };

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes} min`;
}

function formatDistance(meters: number | null) {
  if (!Number.isFinite(meters) || meters == null) return "—";
  return meters >= 1000 ? `${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km` : `${Math.round(meters)} m`;
}

export default function TripDecisionPanel({ route, alternatives, online }: Props) {
  const vehicle = getMobileVehicle();
  if (!route) return null;

  const trafficDelay = route.durationSeconds != null && route.staticDurationSeconds != null
    ? Math.max(0, route.durationSeconds - route.staticDurationSeconds) : null;
  const trafficMinutes = trafficDelay != null ? Math.round(trafficDelay / 60) : null;
  const tollKnown = route.toll?.amount != null;
  const tollText = tollKnown
    ? route.toll!.amount === 0 ? "sem pedágio informado" : route.toll!.amount.toLocaleString("pt-BR", { style: "currency", currency: route.toll!.currency || "BRL" }) + (route.toll!.estimated ? " · estimado" : "")
    : "pedágio não informado";
  const liters = route.fuelConsumptionLiters;
  const fuelConfigured = Boolean(vehicle?.consumption && vehicle.consumption > 0);
  const routeEfficiency = liters != null
    ? `${liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`
    : fuelConfigured && route.distanceMeters
      ? `${(route.distanceMeters / 1000 / vehicle!.consumption).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L teóricos`
      : "consumo não informado";
  const alternativesText = alternatives.length > 1 ? `${alternatives.length} opções consultadas` : "sem alternativa confirmada";
  const trafficState = trafficMinutes == null ? "trânsito não detalhado" : trafficMinutes > 0 ? `+${trafficMinutes} min de impacto` : "fluxo próximo do padrão";

  return (
    <section className="mt-3 rounded-[1.35rem] border border-[#3DE3FF]/15 bg-[#0E171D] p-4 text-white" aria-labelledby="trip-decision-title">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><RouteIcon className="size-4" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Painel de decisão</p>
          <h3 id="trip-decision-title" className="mt-1 text-base font-black">Leitura rápida desta viagem</h3>
          <p className="mt-1 text-[0.62rem] leading-relaxed text-white/45">Dados disponíveis agora, separados de estimativas locais.</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[0.48rem] font-black uppercase tracking-[.08em] text-white/45">{online ? "online" : "offline"}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-white/[.045] p-3"><RouteIcon className="size-3.5 text-[#3DE3FF]" /><p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/40">Distância</p><p className="mt-1 text-sm font-black">{formatDistance(route.distanceMeters)}</p></div>
        <div className="rounded-xl bg-white/[.045] p-3"><Clock3 className="size-3.5 text-[#C7FF3C]" /><p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/40">Tempo</p><p className="mt-1 text-sm font-black">{formatDuration(route.durationSeconds)}</p></div>
        <div className="rounded-xl bg-white/[.045] p-3"><Fuel className="size-3.5 text-[#FFB86B]" /><p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/40">Consumo</p><p className="mt-1 text-sm font-black">{routeEfficiency}</p></div>
        <div className={"rounded-xl p-3 " + (trafficMinutes != null && trafficMinutes >= 10 ? "bg-[#FFC928]/10" : "bg-white/[.045]")}>{trafficMinutes != null && trafficMinutes >= 10 ? <AlertTriangle className="size-3.5 text-[#FFD66B]" /> : <ShieldCheck className="size-3.5 text-[#3DE3FF]" />}<p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/40">Trânsito</p><p className="mt-1 text-sm font-black">{trafficState}</p></div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><p className="text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Pedágio</p><p className="mt-1 text-xs font-extrabold text-white">{tollText}</p></div>
        <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><p className="text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Alternativas</p><p className="mt-1 text-xs font-extrabold text-white">{alternativesText}</p></div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#C7FF3C]/12 bg-[#C7FF3C]/[.035] p-3">
        <CheckCircle2 className="size-4 shrink-0 text-[#C7FF3C]" />
        <p className="text-[0.6rem] leading-relaxed text-white/65">{trafficMinutes != null && trafficMinutes >= 10 ? "Há impacto de trânsito relevante no tempo calculado. Confirme a rota e use seu navegador preferido para a condução." : "A rota selecionada tem dados suficientes para uma decisão rápida. Confirme e deixe Google Maps, Waze ou Apple Maps cuidar da navegação."}</p>
      </div>
    </section>
  );
}
