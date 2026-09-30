import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarRange, Fuel, Gauge, Route as RouteIcon, WalletCards } from "lucide-react";
import { appUrl } from "@/lib/appUrl";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";
import { summarizeSavedRoute } from "@/lib/tripReadiness";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { getMobilityBudget } from "@/lib/mobilityBudget";
import { projectMobilityForecast } from "@/lib/mobilityForecast";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PRICE_KEY = "trajeto-route-fuel-price";

export default function MobilityCostForecast() {
  const [route, setRoute] = useState<OfflineRoute | null>(null);
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [fuelPrice, setFuelPrice] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);
  const [tripsPerWeek, setTripsPerWeek] = useState(5);
  const [budget, setBudget] = useState<number | null>(() => getMobilityBudget());

  useEffect(() => {
    const refresh = () => {
      void listOfflineRoutes().then(routes => setRoute(routes[0] ?? null)).catch(() => setRoute(null));
      setVehicle(getMobileVehicle());
      setBudget(getMobilityBudget());
      try {
        const value = Number(localStorage.getItem(PRICE_KEY) || "");
        setFuelPrice(Number.isFinite(value) && value > 0 ? String(value).replace(".", ",") : "");
      } catch {
        setFuelPrice("");
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    window.addEventListener(mobileVehicleEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
      window.removeEventListener(mobileVehicleEvent, refresh);
    };
  }, []);

  const parsedPrice = Number(fuelPrice.replace(",", "."));
  const validPrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;

  const summary = useMemo(
    () => summarizeSavedRoute(route, vehicle, validPrice),
    [route, vehicle, validPrice],
  );

  const forecast = useMemo(() => {
    if (!summary || summary.estimatedFuelCost == null) return null;
    return projectMobilityForecast({
      oneWayDistanceKm: summary.distanceKm,
      oneWayTripCost: summary.estimatedFuelCost,
      tripsPerWeek,
      roundTrip,
      fuelPricePerLiter: validPrice,
      monthlyBudget: budget,
    });
  }, [summary, tripsPerWeek, roundTrip, validPrice, budget]);

  const savePrice = (value: string) => {
    setFuelPrice(value);
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    try {
      localStorage.setItem(PRICE_KEY, String(parsed));
    } catch {}
  };

  if (!route || !vehicle || !summary) return null;

  return (
    <section className="border-b border-white/8 bg-[#0D151B] py-4 sm:py-7" aria-labelledby="mobility-forecast-title">
      <div className="container">
        <div className="overflow-hidden rounded-3xl border border-[#C7FF3C]/15 bg-[#101A20] shadow-[0_18px_52px_rgba(0,0,0,.2)]">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#C7FF3C]">Previsão de mobilidade</p>
                <h2 id="mobility-forecast-title" className="mt-2 truncate font-display text-xl font-semibold tracking-[-0.05em] text-white">{route.origin} → {route.destination}</h2>
                <p className="mt-1 text-[0.62rem] leading-relaxed text-[#71838C]">Projeção local baseada na rota salva, no veículo cadastrado e no preço informado por você.</p>
              </div>
              <a href={appUrl("/planejar")} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 text-[0.62rem] font-black text-white/80">
                Ajustar rota <ArrowRight className="size-3.5" />
              </a>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr]">
              <label className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[0.58rem] font-bold text-white/55">
                Preço do combustível (R$/L)
                <input value={fuelPrice} onChange={event => savePrice(event.target.value)} inputMode="decimal" placeholder="Ex.: 5,89" className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#0B1014] px-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#3DE3FF]" aria-label="Preço do combustível usado na projeção" />
              </label>

              <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                <p className="text-[0.58rem] font-bold uppercase tracking-[.12em] text-white/40">Viagem</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => setRoundTrip(false)} aria-pressed={!roundTrip} className={!roundTrip ? "min-h-10 rounded-lg bg-[#C7FF3C] px-2 text-[0.58rem] font-black text-[#0B1014]" : "min-h-10 rounded-lg border border-white/8 bg-white/[.02] px-2 text-[0.58rem] font-bold text-white/65"}>Só ida</button>
                  <button type="button" onClick={() => setRoundTrip(true)} aria-pressed={roundTrip} className={roundTrip ? "min-h-10 rounded-lg bg-[#C7FF3C] px-2 text-[0.58rem] font-black text-[#0B1014]" : "min-h-10 rounded-lg border border-white/8 bg-white/[.02] px-2 text-[0.58rem] font-bold text-white/65"}>Ida e volta</button>
                </div>
              </div>

              <label className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[0.58rem] font-bold text-white/55">
                Viagens por semana
                <input type="number" min="0" max="21" step="1" inputMode="numeric" value={tripsPerWeek} onChange={event => setTripsPerWeek(Math.max(0, Math.min(21, Number(event.target.value) || 0)))} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#0B1014] px-3 text-sm font-bold text-white outline-none focus:border-[#3DE3FF]" />
              </label>
            </div>

            {forecast ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                    <RouteIcon className="size-3.5 text-[#3DE3FF]" />
                    <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Por viagem</p>
                    <p className="mt-1 text-sm font-black text-white">{money(forecast.costPerTrip)}</p>
                    <p className="mt-0.5 text-[0.52rem] text-white/35">{forecast.distancePerTripKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                    <WalletCards className="size-3.5 text-[#C7FF3C]" />
                    <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Por semana</p>
                    <p className="mt-1 text-sm font-black text-white">{money(forecast.weeklyCost)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                    <CalendarRange className="size-3.5 text-[#BDA5FF]" />
                    <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Por mês</p>
                    <p className="mt-1 text-sm font-black text-white">{money(forecast.monthlyCost)}</p>
                    <p className="mt-0.5 text-[0.52rem] text-white/35">{forecast.monthlyDistanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km/mês</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
                    <Fuel className="size-3.5 text-[#FFB86B]" />
                    <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Combustível</p>
                    <p className="mt-1 text-sm font-black text-white">{forecast.monthlyLiters != null ? forecast.monthlyLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " L" : "—"}</p>
                    <p className="mt-0.5 text-[0.52rem] text-white/35">{forecast.costPerKm != null ? money(forecast.costPerKm) + "/km" : "custo/km indisponível"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[.04] p-3">
                    <Gauge className="size-3.5 text-[#C7FF3C]" />
                    <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[.1em] text-white/35">Ano</p>
                    <p className="mt-1 text-sm font-black text-white">{money(forecast.annualCost)}</p>
                    <p className="mt-0.5 text-[0.52rem] text-white/35">{tripsPerWeek} viagem(ns)/sem</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {forecast.budgetRemaining != null && (
                    <span className={forecast.budgetRemaining >= 0 ? "rounded-full bg-[#C7FF3C]/10 px-2.5 py-1.5 text-[0.55rem] font-black text-[#DFFF9D]" : "rounded-full bg-[#FFB86B]/10 px-2.5 py-1.5 text-[0.55rem] font-black text-[#FFD49C]"}>
                      {forecast.budgetRemaining >= 0 ? money(forecast.budgetRemaining) + " abaixo do orçamento local" : money(Math.abs(forecast.budgetRemaining)) + " acima do orçamento local"}
                    </span>
                  )}
                  {forecast.budgetPercent != null && <span className="rounded-full bg-white/[.035] px-2.5 py-1.5 text-[0.55rem] font-bold text-white/50">{forecast.budgetPercent.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% do orçamento mensal</span>}
                  <span className="rounded-full bg-white/[.035] px-2.5 py-1.5 text-[0.55rem] font-bold text-white/50">{summary.stale ? "rota salva antiga · revise antes de usar" : "rota salva recente"}</span>
                  <span className="rounded-full bg-white/[.035] px-2.5 py-1.5 text-[0.55rem] font-bold text-white/50">{vehicle.name} · {vehicle.consumption.toLocaleString("pt-BR")} km/L</span>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.06] p-4">
                <p className="text-sm font-extrabold text-white">Informe o preço para ativar a projeção.</p>
                <p className="mt-1 text-xs leading-relaxed text-[#B8C7CD]">A rota e o veículo já estão disponíveis localmente; falta apenas um preço informado por você.</p>
              </div>
            )}

            <p className="mt-4 border-t border-white/8 pt-3 text-[0.58rem] leading-relaxed text-[#71838C]">
              Estimativa local. Não usa cotação ao vivo, não altera a rota e não envia o preço para um serviço externo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
