import { ArrowRight, CarFront, CheckCircle2, CircleDollarSign, Fuel, MapPin, Route, Wallet } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { getFavoriteDestination, getMobileDestinations, mobileDestinationEvent, getDestinationUsage } from "@/lib/mobileDestinations";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";
import { getMobileVehicle, mobileVehicleEvent, type MobileVehicle } from "@/lib/mobileVehicle";
import { compareMobilityBudget, getMobilityBudget } from "@/lib/mobilityBudget";
import { summarizeCurrentMobilityMonth } from "@/components/MobilityDashboardCard";
import { fuelLogEvent } from "@/lib/fuelLog";
import { mobilityExpenseEvent } from "@/lib/mobilityExpenses";
import { summarizeSavedRoute } from "@/lib/tripReadiness";
import { getAutomaticDailyMode, getSavedDailyMode, type DailyModeId } from "@/lib/dailyModes";
import { getLastTrip } from "@/lib/mobilePreferences";
import { chooseMobilePrimaryAction } from "@/lib/mobilePrimaryAction";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function DailyMobilityHub() {
  const [stamp, setStamp] = useState(0);
  const [routes, setRoutes] = useState<OfflineRoute[]>([]);
  const [vehicle, setVehicle] = useState<MobileVehicle | null>(() => getMobileVehicle());
  const [destinations, setDestinations] = useState(() => getMobileDestinations());
  const [usage, setUsage] = useState(() => getDestinationUsage());
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [dailyMode, setDailyMode] = useState<DailyModeId>(() => getSavedDailyMode() ?? "automatico");

  useEffect(() => {
    const refresh = () => {
      setStamp(value => value + 1);
      setVehicle(getMobileVehicle());
      setDestinations(getMobileDestinations());
      setUsage(getDestinationUsage());
      setOnline(navigator.onLine);
      setDailyMode(getSavedDailyMode() ?? "automatico");
      void listOfflineRoutes().then(setRoutes).catch(() => setRoutes([]));
    };
    refresh();
    const events = [offlineRouteEvent, mobileVehicleEvent, mobileDestinationEvent, fuelLogEvent, mobilityExpenseEvent];
    events.forEach(event => window.addEventListener(event, refresh));
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      events.forEach(event => window.removeEventListener(event, refresh));
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  const favorite = useMemo(
    () => getFavoriteDestination(destinations, usage),
    [destinations, usage],
  );
  const latestRoute = routes[0] ?? null;
  const summary = useMemo(() => summarizeCurrentMobilityMonth(), [stamp]);
  const budget = useMemo(() => compareMobilityBudget(summary.total, getMobilityBudget()), [summary.total, stamp]);
  const routeInfo = useMemo(() => {
    let price: number | null = null;
    try {
      const stored = Number(localStorage.getItem("trajeto-last-fuel-price"));
      price = Number.isFinite(stored) && stored > 0 ? stored : null;
    } catch {}
    return summarizeSavedRoute(latestRoute, vehicle, price);
  }, [latestRoute, vehicle, stamp]);
  const hasAnySetup = Boolean(favorite || latestRoute || vehicle || budget);

  const automaticMode = getAutomaticDailyMode(online, routes.length);
  const primary = chooseMobilePrimaryAction({
    online,
    mode: dailyMode,
    automaticMode,
    savedRoutes: routes.length,
    favorite: favorite ? { label: favorite.label, value: favorite.value } : null,
    lastTrip: getLastTrip(),
  });
  const nextAction = primary.kind === "destination" && primary.target?.destination
    ? {
        label: "Ir para " + primary.label,
        detail: primary.target.destination,
        href: appUrl("/planejar") + "?destino=" + encodeURIComponent(primary.target.destination),
      }
    : primary.kind === "repeat" && primary.target?.origin && primary.target?.destination
      ? {
          label: "Repetir última viagem",
          detail: primary.target.origin + " → " + primary.target.destination,
          href: appUrl("/planejar") + "?origem=" + encodeURIComponent(primary.target.origin) + "&destino=" + encodeURIComponent(primary.target.destination),
        }
      : primary.kind === "offline"
        ? {
            label: "Continuar rota salva",
            detail: latestRoute ? latestRoute.origin + " → " + latestRoute.destination : "Rotas preparadas neste aparelho.",
            href: appUrl("/planejar?salvos=1"),
          }
        : primary.kind === "economy"
          ? {
              label: "Ver custo da viagem",
              detail: "Abra a calculadora para comparar o impacto do deslocamento.",
              href: appUrl("/") + "#calculadora",
            }
          : latestRoute
            ? {
                label: "Continuar última rota",
                detail: latestRoute.origin + " → " + latestRoute.destination,
                href: appUrl("/planejar") + "?rota=" + encodeURIComponent(latestRoute.id) + "&origem=" + encodeURIComponent(latestRoute.origin) + "&destino=" + encodeURIComponent(latestRoute.destination),
              }
            : {
                label: "Planejar minha próxima viagem",
                detail: "Defina origem e destino e salve a rota para reutilizar depois.",
                href: appUrl("/planejar"),
              };

  return (
    <section className="container py-8 sm:py-10" aria-labelledby="daily-mobility-title">
      <div className="premium-surface overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#121B22] text-white shadow-[0_20px_60px_rgba(0,0,0,.18)]">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#C7FF3C]">Meu dia · {dailyMode === "automatico" ? "automático" : dailyMode}</p>
            <h2 id="daily-mobility-title" className="mt-2 font-display text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[.9] tracking-[-.065em]">
              Tudo pronto para o próximo deslocamento.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
              O Trajeto reúne o que você já informou neste aparelho e aponta o próximo passo. Nada aqui é inventado: sem dados, o bloco simplesmente não presume.
            </p>

            <div className="mt-5 rounded-2xl border border-[#C7FF3C]/20 bg-[#C7FF3C]/[0.06] p-4">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#C7FF3C]">Próxima ação</p>
              <p className="mt-1 text-base font-extrabold">{nextAction.label}</p>
              <p className="mt-1 truncate text-xs text-white/55">{nextAction.detail}</p>
              <a href={nextAction.href} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]">
                Continuar <ArrowRight className="size-4" />
              </a>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2"><MapPin className="size-4 text-[#3DE3FF]" /><span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/45">Destino recorrente</span></div>
              <p className="mt-2 text-sm font-extrabold">{favorite ? favorite.label + " · " + favorite.value : "Ainda não configurado"}</p>
              <p className="mt-1 text-[0.62rem] text-white/50">{favorite ? "Uso local: " + (usage[favorite.id]?.count ?? 0) + " vez(es)" : "Salve Casa, Trabalho ou outro destino."}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2"><Route className="size-4 text-[#BDA5FF]" /><span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/45">Rota offline</span></div>
              <p className="mt-2 text-sm font-extrabold">{latestRoute ? routes.length + " rota" + (routes.length === 1 ? "" : "s") + " pronta" + (routes.length === 1 ? "" : "s") : "Nenhuma rota salva"}</p>
              <p className="mt-1 truncate text-[0.62rem] text-white/50">{latestRoute ? latestRoute.origin + " → " + latestRoute.destination : "Salve uma rota para continuar sem conexão."}</p>
              {routeInfo && <p className="mt-2 text-[0.6rem] font-bold text-white/60">{routeInfo.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km{routeInfo.durationMinutes !== null ? " · " + routeInfo.durationMinutes + " min" : ""}{routeInfo.stale ? " · cópia antiga" : ""}</p>}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2"><CarFront className="size-4 text-[#C7FF3C]" /><span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/45">Veículo</span></div>
              <p className="mt-2 text-sm font-extrabold">{vehicle?.name ?? "Não configurado"}</p>
              <p className="mt-1 text-[0.62rem] text-white/50">{vehicle ? vehicle.consumption.toLocaleString("pt-BR") + " km/L · tanque " + vehicle.tank.toLocaleString("pt-BR") + " L" : "Cadastre o veículo para calcular autonomia e custo."}</p>
            </div>
            {routeInfo?.estimatedFuelCost !== null && routeInfo?.estimatedFuelCost !== undefined && <div className="rounded-2xl border border-[#3DE3FF]/15 bg-[#3DE3FF]/[0.04] p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2"><Fuel className="size-4 text-[#3DE3FF]" /><span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/45">Custo da última rota</span></div>
              <p className="mt-2 text-sm font-extrabold">{money(routeInfo.estimatedFuelCost)} estimados</p>
              <p className="mt-1 text-[0.62rem] text-white/50">Combustível calculado localmente com seu veículo e o último preço registrado.</p>
            </div>}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2"><CircleDollarSign className="size-4 text-[#FFC928]" /><span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white/45">Este mês</span></div>
              <p className="mt-2 text-sm font-extrabold">{summary.entries ? money(summary.total) : "Sem registros"}</p>
              <p className="mt-1 text-[0.62rem] text-white/50">
                {budget ? `${money(Math.max(0, budget.remaining))} restante · ${budget.withinBudget ? "dentro do limite" : "acima do limite"}` : "Defina um orçamento para acompanhar o limite."}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.62rem] font-bold text-white/55">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-[#C7FF3C]" /> Dados locais</span>
            <span className="inline-flex items-center gap-1.5"><Fuel className="size-3.5 text-[#3DE3FF]" /> Combustível registrado: {money(summary.fuelCost)}</span>
            <span className="inline-flex items-center gap-1.5"><Wallet className="size-3.5 text-[#BDA5FF]" /> Extras registrados: {money(summary.extraCost)}</span>
            {!hasAnySetup && <span>Configure o primeiro destino, veículo ou rota para começar.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
