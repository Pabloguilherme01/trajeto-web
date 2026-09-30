import { AlertTriangle, CheckCircle2, Clock3, Fuel, Route as RouteIcon, ShieldCheck } from "lucide-react";
import type { RouteIntelligenceRoute } from "@/lib/routeIntelligence";
import { getMobileVehicle } from "@/lib/mobileVehicle";

type Props = {
  route: RouteIntelligenceRoute | null;
  alternatives: RouteIntelligenceRoute[];
  online: boolean;
};

function durationLabel(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes >= 60 ? Math.floor(minutes / 60) + "h " + (minutes % 60) + "min" : minutes + " min";
}

function distanceLabel(meters: number | null) {
  if (meters == null || !Number.isFinite(meters)) return "—";
  return meters >= 1000 ? (meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km" : Math.round(meters) + " m";
}

export default function TripDecisionPanel({ route, alternatives, online }: Props) {
  const vehicle = getMobileVehicle();
  if (!route) return null;

  const trafficMinutes = route.durationSeconds != null && route.staticDurationSeconds != null
    ? Math.max(0, Math.round((route.durationSeconds - route.staticDurationSeconds) / 60))
    : null;
  const fuelLiters = route.fuelConsumptionLiters;
  const vehicleLiters = vehicle && route.distanceMeters != null && vehicle.consumption > 0
    ? route.distanceMeters / 1000 / vehicle.consumption
    : null;
  const toll = route.toll?.amount;
  const trafficWarning = trafficMinutes != null && trafficMinutes >= 10;

  return (
    <section className="mt-3 rounded-3xl border border-white/8 bg-[#10191F] p-4 text-white" aria-labelledby="trip-decision-title">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><RouteIcon className="size-4" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.55rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Decisão</p>
          <h2 id="trip-decision-title" className="mt-1 text-base font-black">O que importa nesta rota.</h2>
          <p className="mt-1 text-[0.6rem] leading-relaxed text-white/35">{online ? "Dados disponíveis nesta consulta." : "Modo offline; confirme a atualização antes de navegar."}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/[.035] p-3"><Clock3 className="size-3.5 text-[#C7FF3C]" /><p className="mt-2 text-[0.5rem] uppercase tracking-[.1em] text-white/30">Tempo</p><p className="mt-1 text-sm font-black">{durationLabel(route.durationSeconds)}</p></div>
        <div className="rounded-2xl bg-white/[.035] p-3"><RouteIcon className="size-3.5 text-[#3DE3FF]" /><p className="mt-2 text-[0.5rem] uppercase tracking-[.1em] text-white/30">Distância</p><p className="mt-1 text-sm font-black">{distanceLabel(route.distanceMeters)}</p></div>
        <div className="rounded-2xl bg-white/[.035] p-3"><Fuel className="size-3.5 text-[#FFB86B]" /><p className="mt-2 text-[0.5rem] uppercase tracking-[.1em] text-white/30">Consumo</p><p className="mt-1 text-sm font-black">{fuelLiters != null ? fuelLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " L" : vehicleLiters != null ? vehicleLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " L*" : "—"}</p></div>
        <div className={"rounded-2xl p-3 " + (trafficWarning ? "bg-[#FFB86B]/[.08]" : "bg-white/[.035]")}>{trafficWarning ? <AlertTriangle className="size-3.5 text-[#FFB86B]" /> : <ShieldCheck className="size-3.5 text-[#C7FF3C]" />}<p className="mt-2 text-[0.5rem] uppercase tracking-[.1em] text-white/30">Trânsito</p><p className="mt-1 text-sm font-black">{trafficMinutes == null ? "—" : trafficMinutes + " min"}</p></div>
      </div>

      <div className="mt-2 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[0.62rem] leading-relaxed text-white/45">
        Pedágio: <strong className="text-white/75">{toll == null ? "não informado" : toll === 0 ? "sem pedágio informado" : toll.toLocaleString("pt-BR", { style: "currency", currency: route.toll?.currency || "BRL" })}</strong>
        {" · "}
        Alternativas consultadas: <strong className="text-white/75">{alternatives.length}</strong>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[#C7FF3C]/10 bg-[#C7FF3C]/[.035] p-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#C7FF3C]" />
        <p className="text-[0.59rem] leading-relaxed text-white/55">{trafficWarning ? "Existe impacto relevante no tempo. A navegação externa deve confirmar o trânsito antes de sair." : "A rota contém dados suficientes para uma decisão inicial. O aplicativo externo assume a condução ao sair."}</p>
      </div>
    </section>
  );
}
