import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CarFront, Clock3, Fuel, Repeat2 } from "lucide-react";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { calculateRouteTotalCost } from "@/lib/routeTotalCost";
import { calculateRecurringRouteImpact } from "@/lib/routeRecurringImpact";
import type { RouteIntelligenceRoute } from "@/lib/routeIntelligence";

const PRICE_KEY = "trajeto-route-fuel-price";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RouteRecurringImpactCard(props: { routes: RouteIntelligenceRoute[]; selectedRouteId: string }) {
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [fuelPrice, setFuelPrice] = useState<number | null>(null);
  const [tripsPerWeek, setTripsPerWeek] = useState(5);
  const [roundTrip, setRoundTrip] = useState(false);

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
      roundTrip,
    });

    return props.routes
      .filter(route => route.id !== baseline.id)
      .map(route => {
        const cost = calculateRouteTotalCost({
          distanceKm: (route.distanceMeters ?? 0) / 1000,
          consumptionKmPerLiter: vehicle.consumption,
          fuelPricePerLiter: fuelPrice,
          tollAmount: route.toll?.amount ?? null,
          roundTrip,
        });
        const deltaMinutes = route.durationSeconds != null && baseline.durationSeconds != null
          ? Math.round((route.durationSeconds - baseline.durationSeconds) / 60)
          : null;
        const deltaCost = cost.totalCost != null && base.totalCost != null ? cost.totalCost - base.totalCost : null;
        return { route, deltaMinutes, deltaCost, impact: calculateRecurringRouteImpact(deltaCost, deltaMinutes, tripsPerWeek) };
      });
  }, [baseline, props.routes, vehicle, fuelPrice, tripsPerWeek, roundTrip]);

  if (!baseline || rows.length === 0) return null;

  return (
    <section className="mt-4 rounded-3xl border border-[#BDA5FF]/18 bg-[#111820] p-4 text-white sm:p-5" aria-labelledby="route-recurring-impact-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#BDA5FF]">Impacto recorrente</p>
          <h3 id="route-recurring-impact-title" className="mt-1 font-display text-xl font-semibold tracking-[-0.045em]">Veja o efeito de repetir esta escolha.</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/45">As projeções usam o mesmo preço local e veículo já usados no cálculo da rota. Não são cotações futuras.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.04] px-2.5 py-1.5 text-[0.55rem] font-bold text-white/50"><CarFront className="size-3.5 text-[#3DE3FF]" /> {vehicle?.name || "Cadastre o veículo"}</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[0.58rem] font-bold text-white/50">
          Viagens por semana
          <select value={tripsPerWeek} onChange={event => setTripsPerWeek(Number(event.target.value))} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#0B1014] px-3 text-sm font-bold text-white outline-none focus:border-[#3DE3FF]">
            {Array.from({ length: 14 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} {value === 1 ? "viagem" : "viagens"} / semana</option>)}
          </select>
        </label>
        <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
          <p className="text-[0.58rem] font-bold uppercase tracking-[.12em] text-white/40">Ciclo</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <button type="button" aria-pressed={!roundTrip} onClick={() => setRoundTrip(false)} className={!roundTrip ? "min-h-11 rounded-xl bg-[#C7FF3C] text-[0.6rem] font-black text-[#0B1014]" : "min-h-11 rounded-xl border border-white/8 text-[0.6rem] font-bold text-white/60"}>Só ida</button>
            <button type="button" aria-pressed={roundTrip} onClick={() => setRoundTrip(true)} className={roundTrip ? "min-h-11 rounded-xl bg-[#C7FF3C] text-[0.6rem] font-black text-[#0B1014]" : "min-h-11 rounded-xl border border-white/8 text-[0.6rem] font-bold text-white/60"}>Ida + volta</button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {rows.map(({ route, deltaMinutes, deltaCost, impact }) => (
          <article key={route.id} className="rounded-2xl border border-white/8 bg-white/[.02] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-white">{route.id === "principal" ? "Principal" : route.id.replace("alternativa-", "Alternativa ")}</p>
                <p className="mt-1 text-[0.57rem] font-bold text-white/40">Diferença por viagem: {deltaCost == null ? "custo incompleto" : (deltaCost > 0 ? "+" : "") + money(deltaCost)} {deltaMinutes == null ? "· tempo indisponível" : "· " + (deltaMinutes > 0 ? "+" : "") + deltaMinutes + " min"}</p>
              </div>
              <Repeat2 className="size-4 shrink-0 text-[#BDA5FF]" />
            </div>

            {impact ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-white/[.035] p-2.5">
                  <Fuel className="size-3.5 text-[#C7FF3C]" />
                  <p className="mt-1 text-[0.49rem] font-black uppercase tracking-[.09em] text-white/30">Semana</p>
                  <p className="mt-1 text-xs font-black">{impact.weeklyDelta >= 0 ? "+" : ""}{money(impact.weeklyDelta)}</p>
                </div>
                <div className="rounded-xl bg-white/[.035] p-2.5">
                  <CalendarDays className="size-3.5 text-[#3DE3FF]" />
                  <p className="mt-1 text-[0.49rem] font-black uppercase tracking-[.09em] text-white/30">Mês</p>
                  <p className="mt-1 text-xs font-black">{impact.monthlyDelta >= 0 ? "+" : ""}{money(impact.monthlyDelta)}</p>
                </div>
                <div className="rounded-xl bg-white/[.035] p-2.5">
                  <Clock3 className="size-3.5 text-[#FFB86B]" />
                  <p className="mt-1 text-[0.49rem] font-black uppercase tracking-[.09em] text-white/30">Tempo / mês</p>
                  <p className="mt-1 text-xs font-black">{impact.monthlyMinutesDelta == null ? "—" : (impact.monthlyMinutesDelta > 0 ? "+" : "") + Math.round(impact.monthlyMinutesDelta) + " min"}</p>
                </div>
                <div className="rounded-xl bg-[#BDA5FF]/[.05] p-2.5">
                  <Repeat2 className="size-3.5 text-[#BDA5FF]" />
                  <p className="mt-1 text-[0.49rem] font-black uppercase tracking-[.09em] text-white/30">Ano</p>
                  <p className="mt-1 text-xs font-black">{impact.annualDelta >= 0 ? "+" : ""}{money(impact.annualDelta)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3 text-[0.58rem] leading-relaxed text-white/40">Complete veículo e preço local para projetar o impacto recorrente.</p>
            )}

            {impact?.costPerMinuteSaved != null && (
              <p className="mt-2 text-[0.56rem] font-bold text-white/45">
                Custo adicional por minuto economizado: {money(impact.costPerMinuteSaved)} / min.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
