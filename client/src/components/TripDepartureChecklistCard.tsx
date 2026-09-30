import { CircleCheck, CircleDashed, Fuel, Navigation, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { RouteIntelligenceRoute } from "@/lib/routeIntelligence";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { buildTripChecklist } from "@/lib/tripChecklist";

const PRICE_KEY = "trajeto-route-fuel-price";

export default function TripDepartureChecklistCard(props: {
  route: RouteIntelligenceRoute | null;
  routeConfirmed: boolean;
  online: boolean;
  loadedFromOffline: boolean;
}) {
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [fuelPriceConfigured, setFuelPriceConfigured] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setVehicle(getMobileVehicle());
      try {
        const value = Number(localStorage.getItem(PRICE_KEY) || "");
        setFuelPriceConfigured(Number.isFinite(value) && value > 0);
      } catch {
        setFuelPriceConfigured(false);
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(mobileVehicleEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobileVehicleEvent, refresh);
    };
  }, []);

  if (!props.route) return null;

  const items = buildTripChecklist({
    routeAvailable: props.route.distanceMeters != null && props.route.durationSeconds != null,
    routeConfirmed: props.routeConfirmed,
    distanceKm: props.route.distanceMeters != null ? props.route.distanceMeters / 1000 : null,
    durationSeconds: props.route.durationSeconds,
    online: props.online,
    loadedFromOffline: props.loadedFromOffline,
    vehicleConsumption: vehicle?.consumption ?? null,
    vehicleTankLiters: vehicle?.tank ?? null,
    tollKnown: props.route.toll?.amount != null,
    fuelPriceConfigured,
  });

  const attentionCount = items.filter(item => item.status === "attention").length;
  const readyCount = items.length - attentionCount;

  return (
    <section className="mt-4 rounded-3xl border border-[#C7FF3C]/15 bg-[#10191F] p-4 text-white sm:p-5" aria-labelledby="trip-departure-checklist-title">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
          <Navigation className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.58rem] font-black uppercase tracking-[.16em] text-[#C7FF3C]">Antes de sair</p>
          <h3 id="trip-departure-checklist-title" className="mt-1 text-xl font-black tracking-[-.04em]">Checklist desta viagem.</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/40">
            {attentionCount === 0 ? "Todos os itens verificáveis estão prontos." : attentionCount + " ponto" + (attentionCount === 1 ? " de atenção" : "s de atenção") + " antes de navegar."}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/[.05] px-2.5 py-1.5 text-[0.55rem] font-black text-white/55">
          {readyCount}/{items.length}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map(item => {
          const ready = item.status === "ready";
          return (
            <article key={item.key} className={"rounded-2xl border p-3 " + (ready ? "border-[#C7FF3C]/12 bg-[#C7FF3C]/[.025]" : "border-[#FFB86B]/15 bg-[#FFB86B]/[.035]")}>
              <div className="flex items-start gap-2.5">
                {ready ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-[#C7FF3C]" /> : <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#FFB86B]" />}
                <div className="min-w-0">
                  <p className="text-[0.58rem] font-black uppercase tracking-[.1em] text-white/45">{item.label}</p>
                  <p className="mt-1 text-[0.62rem] font-bold leading-relaxed text-white/80">{item.detail}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/8 bg-white/[.018] p-3">
          <Fuel className="size-3.5 text-[#3DE3FF]" />
          <p className="mt-1 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Veículo</p>
          <p className="mt-1 text-xs font-black">{vehicle ? vehicle.name : "não cadastrado"}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[.018] p-3">
          <CircleDashed className="size-3.5 text-[#BDA5FF]" />
          <p className="mt-1 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Leitura</p>
          <p className="mt-1 text-xs font-black">{props.loadedFromOffline ? "snapshot local" : props.online ? "dados atuais" : "sem conexão"}</p>
        </div>
      </div>

      <p className="mt-3 border-t border-white/8 pt-3 text-[0.54rem] leading-relaxed text-white/30">
        O checklist informa condições e dados disponíveis; não substitui a decisão do motorista nem a navegação externa.
      </p>
    </section>
  );
}
