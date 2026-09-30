import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CarFront, Clock3, Fuel, Scale } from "lucide-react";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { calculateRouteTotalCost } from "@/lib/routeTotalCost";
import type { RouteIntelligenceRoute } from "@/lib/routeIntelligence";

const PRICE_KEY = "trajeto-route-fuel-price";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RouteCostComparisonCard(props: { routes: RouteIntelligenceRoute[]; selectedRouteId: string }) {
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [fuelPrice, setFuelPrice] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      setVehicle(getMobileVehicle());
      try {
        const value = Number(localStorage.getItem(PRICE_KEY) || "");
        setFuelPrice(Number.isFinite(value) && value > 0 ? value : null);
      } catch {
        setFuelPrice(null);
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

  const baseline = useMemo(
    () => props.routes.find(route => route.id === props.selectedRouteId) ?? props.routes[0] ?? null,
    [props.routes, props.selectedRouteId],
  );

  const rows = useMemo(() => {
    if (!baseline || !vehicle || fuelPrice == null) return [];
    const base = calculateRouteTotalCost({
      distanceKm: (baseline.distanceMeters ?? 0) / 1000,
      consumptionKmPerLiter: vehicle.consumption,
      fuelPricePerLiter: fuelPrice,
      tollAmount: baseline.toll?.amount ?? null,
      roundTrip: false,
    });

    return props.routes
      .filter(route => route.id !== baseline.id)
      .map(route => {
        const cost = calculateRouteTotalCost({
          distanceKm: (route.distanceMeters ?? 0) / 1000,
          consumptionKmPerLiter: vehicle.consumption,
          fuelPricePerLiter: fuelPrice,
          tollAmount: route.toll?.amount ?? null,
          roundTrip: false,
        });
        const deltaMinutes = route.durationSeconds != null && baseline.durationSeconds != null
          ? Math.round((route.durationSeconds - baseline.durationSeconds) / 60)
          : null;
        const deltaCost = cost.totalCost != null && base.totalCost != null ? cost.totalCost - base.totalCost : null;
        return { route, cost, deltaMinutes, deltaCost };
      });
  }, [baseline, props.routes, vehicle, fuelPrice]);

  if (!baseline || rows.length === 0) return null;

  return (
    <section className="mt-4 rounded-3xl border border-[#3DE3FF]/15 bg-[#0F181E] p-4 text-white sm:p-5" aria-labelledby="route-cost-comparison-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#3DE3FF]">Tempo × custo</p>
          <h3 id="route-cost-comparison-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.045em]">Compare sem trocar de contexto.</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/45">Diferenças calculadas em relação à rota selecionada, usando seu veículo e o preço local salvo.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.04] px-2.5 py-1.5 text-[0.55rem] font-bold text-white/50"><CarFront className="size-3.5 text-[#3DE3FF]" /> {vehicle.name || "Meu veículo"}</span>
      </div>

      <div className="mt-4 grid gap-2">
        {rows.map(({ route, cost, deltaMinutes, deltaCost }) => (
          <article key={route.id} className="rounded-2xl border border-white/8 bg-white/[.02] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-white">{route.id === "principal" ? "Principal" : route.id.replace("alternativa-", "Alternativa ")}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.58rem] font-bold text-white/45">
                  <span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> {route.durationSeconds != null ? Math.round(route.durationSeconds / 60) + " min" : "tempo indisponível"}</span>
                  <span className="inline-flex items-center gap-1"><Fuel className="size-3" /> {cost.totalCost != null ? money(cost.totalCost) : "custo incompleto"}</span>
                </div>
              </div>
              <Scale className="size-4 shrink-0 text-[#BDA5FF]" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className={deltaMinutes == null ? "rounded-xl bg-white/[.025] p-2.5" : deltaMinutes <= 0 ? "rounded-xl bg-[#C7FF3C]/[.05] p-2.5" : "rounded-xl bg-[#FFB86B]/[.06] p-2.5"}>
                <p className="text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Tempo vs selecionada</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-black">
                  {deltaMinutes == null ? "—" : deltaMinutes === 0 ? "igual" : (deltaMinutes > 0 ? "+" : "") + deltaMinutes + " min"}
                  {deltaMinutes != null && deltaMinutes !== 0 && (deltaMinutes > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />)}
                </p>
              </div>
              <div className={deltaCost == null ? "rounded-xl bg-white/[.025] p-2.5" : deltaCost <= 0 ? "rounded-xl bg-[#C7FF3C]/[.05] p-2.5" : "rounded-xl bg-[#FFB86B]/[.06] p-2.5"}>
                <p className="text-[0.5rem] font-black uppercase tracking-[.1em] text-white/30">Custo vs selecionada</p>
                <p className="mt-1 text-xs font-black">
                  {deltaCost == null ? "—" : (deltaCost > 0 ? "+" : "") + money(deltaCost)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
