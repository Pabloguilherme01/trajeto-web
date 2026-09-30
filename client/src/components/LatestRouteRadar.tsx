import { BatteryMedium, Clock3, Gauge, RefreshCw, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";
import { summarizeSavedRoute } from "@/lib/tripReadiness";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ageLabel(savedAt: string) {
  const time = Date.parse(savedAt);
  if (!Number.isFinite(time)) return "data indisponível";
  const hours = Math.floor(Math.max(0, Date.now() - time) / 3600000);
  if (hours < 1) return "salva há menos de 1 h";
  if (hours < 24) return `salva há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `salva há ${days} dia${days === 1 ? "" : "s"}`;
}

export default function LatestRouteRadar() {
  const [route, setRoute] = useState<OfflineRoute | null>(null);
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [fuelPrice, setFuelPrice] = useState<number | null>(null);
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    const refresh = () => {
      void listOfflineRoutes().then(routes => setRoute(routes[0] ?? null)).catch(() => setRoute(null));
      setVehicle(getMobileVehicle());
      try {
        const value = Number(localStorage.getItem("trajeto-route-fuel-price") || "");
        setFuelPrice(Number.isFinite(value) && value > 0 ? value : null);
      } catch {
        setFuelPrice(null);
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

  const summary = useMemo(() => summarizeSavedRoute(route, vehicle, fuelPrice), [route, vehicle, fuelPrice, stamp]);

  useEffect(() => {
    if (!summary) return;
    const timer = window.setInterval(() => setStamp(value => value + 1), 60000);
    return () => window.clearInterval(timer);
  }, [summary]);

  if (!route || !summary) return null;

  const rangeKm = vehicle ? Math.max(0, vehicle.consumption * vehicle.tank) : null;
  const rangeAfterTrip = rangeKm != null ? rangeKm - summary.distanceKm : null;
  const refuels = rangeKm != null && rangeKm > 0 ? Math.max(0, Math.ceil(summary.distanceKm / rangeKm) - 1) : null;

  return (
    <section className="border-b border-white/8 bg-[#10181F] py-4 sm:py-6" aria-labelledby="latest-route-radar-title">
      <div className="container">
        <div className="overflow-hidden rounded-3xl border border-[#3DE3FF]/15 bg-[#0D151B] shadow-[0_18px_52px_rgba(0,0,0,.2)]">
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#3DE3FF]">Radar da última viagem</p>
                  <span className={summary.stale ? "rounded-full bg-[#FFB86B]/10 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#FFD49C]" : "rounded-full bg-[#C7FF3C]/10 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#C7FF3C]"}>
                    {summary.stale ? "snapshot antigo" : "snapshot recente"}
                  </span>
                </div>
                <h2 id="latest-route-radar-title" className="mt-2 truncate font-display text-xl font-semibold tracking-[-0.05em] text-white">{route.origin} → {route.destination}</h2>
                <p className="mt-1 text-[0.62rem] text-[#71838C]">{ageLabel(route.savedAt)} · dados preservados neste aparelho</p>
              </div>
              <RouteIcon className="mt-1 size-5 shrink-0 text-[#C7FF3C]" aria-hidden="true" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <RouteIcon className="size-3.5 text-[#3DE3FF]" />
                <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[0.1em] text-white/35">Distância</p>
                <p className="mt-1 text-sm font-black text-white">{summary.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <Clock3 className="size-3.5 text-[#C7FF3C]" />
                <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[0.1em] text-white/35">Duração</p>
                <p className="mt-1 text-sm font-black text-white">{summary.durationMinutes != null ? `${summary.durationMinutes} min` : "—"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <Gauge className="size-3.5 text-[#BDA5FF]" />
                <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[0.1em] text-white/35">Combustível</p>
                <p className="mt-1 text-sm font-black text-white">{summary.estimatedFuelCost != null ? money(summary.estimatedFuelCost) : "cadastre preço"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <BatteryMedium className="size-3.5 text-[#FFB86B]" />
                <p className="mt-2 text-[0.5rem] font-black uppercase tracking-[0.1em] text-white/35">Após a rota</p>
                <p className="mt-1 text-sm font-black text-white">{rangeAfterTrip != null ? `${Math.max(0, rangeAfterTrip).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km` : "autonomia não cadastrada"}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.035] px-2.5 py-1.5 text-[0.55rem] font-bold text-white/55">
                <ShieldCheck className="size-3 text-[#3DE3FF]" />
                {summary.stale ? "Recalcule antes de confiar em trânsito/dados ao vivo." : "Boa para continuar offline."}
              </span>
              {refuels != null && refuels > 0 && (
                <span className="rounded-full bg-[#FFB86B]/10 px-2.5 py-1.5 text-[0.55rem] font-black text-[#FFD49C]">
                  {refuels} parada(s) de abastecimento estimada(s)
                </span>
              )}
              {vehicle && (
                <span className="rounded-full bg-white/[0.035] px-2.5 py-1.5 text-[0.55rem] font-bold text-white/45">
                  {vehicle.name} · {vehicle.consumption.toLocaleString("pt-BR")} km/L · tanque {vehicle.tank.toLocaleString("pt-BR")} L
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={appUrl("/planejar") + "?rota=" + encodeURIComponent(route.id) + "&origem=" + encodeURIComponent(route.origin) + "&destino=" + encodeURIComponent(route.destination)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014]"
              >
                Continuar rota
              </a>
              <a
                href={appUrl("/planejar") + "?origem=" + encodeURIComponent(route.origin) + "&destino=" + encodeURIComponent(route.destination)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[0.62rem] font-black text-white/75"
              >
                {summary.stale ? <RefreshCw className="size-3.5" /> : <Gauge className="size-3.5" />}
                {summary.stale ? "Atualizar dados" : "Recalcular"}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
