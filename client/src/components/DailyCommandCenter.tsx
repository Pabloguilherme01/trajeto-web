import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Accessibility,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  Fuel,
  MapPin,
  Route,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { appUrl } from "@/lib/appUrl";
import {
  buildDailyModes,
  getAutomaticDailyMode,
  getSavedDailyMode,
  setSavedDailyMode,
  type DailyModeId,
} from "@/lib/dailyModes";
import {
  getDestinationUsage,
  getFavoriteDestination,
  getMobileDestinations,
  mobileDestinationEvent,
} from "@/lib/mobileDestinations";
import { getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { getMobileVehicle, mobileVehicleEvent } from "@/lib/mobileVehicle";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";

const OPEN_ACCESSIBILITY_EVENT = "trajeto-open-accessibility";

function openAccessibility() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_ACCESSIBILITY_EVENT));
  }
}

const modeIcon: Record<DailyModeId, typeof Sparkles> = {
  automatico: Sparkles,
  proxima: Compass,
  repetir: Route,
  economia: CircleDollarSign,
  offline: WifiOff,
};

export default function DailyCommandCenter() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [routes, setRoutes] = useState<OfflineRoute[]>([]);
  const [destinationVersion, setDestinationVersion] = useState(0);
  const [vehicleVersion, setVehicleVersion] = useState(0);
  const [selected, setSelected] = useState<DailyModeId>(() => getSavedDailyMode() ?? "automatico");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setOnline(typeof navigator === "undefined" || navigator.onLine);
      void listOfflineRoutes().then(setRoutes).catch(() => setRoutes([]));
      setDestinationVersion(value => value + 1);
      setVehicleVersion(value => value + 1);
    };
    refresh();
    const events = [mobileDestinationEvent, mobilePreferenceEvent, mobileVehicleEvent, offlineRouteEvent];
    events.forEach(event => window.addEventListener(event, refresh));
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      events.forEach(event => window.removeEventListener(event, refresh));
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const destinations = useMemo(() => getMobileDestinations(), [destinationVersion]);
  const usage = useMemo(() => getDestinationUsage(), [destinationVersion]);
  const favorite = useMemo(() => getFavoriteDestination(destinations, usage), [destinations, usage]);
  const lastTrip = useMemo(() => getLastTrip(), [destinationVersion, vehicleVersion]);
  const vehicle = useMemo(() => getMobileVehicle(), [vehicleVersion]);
  const automatic = getAutomaticDailyMode(online, routes.length);
  const modes = buildDailyModes(online, routes.length);
  const activeId = selected === "automatico" ? automatic : selected;
  const active = modes.find(mode => mode.id === activeId) ?? modes[0];
  const completed = [favorite, lastTrip, vehicle, routes.length > 0].filter(Boolean).length;
  const primary = active?.id === "repetir" && lastTrip
    ? {
        label: "Repetir última viagem",
        detail: lastTrip.origin + " → " + lastTrip.destination,
        href: appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination),
      }
    : active?.id === "proxima" && favorite
      ? {
          label: "Ir para " + favorite.label,
          detail: favorite.value,
          href: appUrl("/planejar") + "?destino=" + encodeURIComponent(favorite.value),
        }
      : active?.id === "economia"
        ? {
            label: "Calcular custo",
            detail: "Consumo, combustível e impacto mensal.",
            href: appUrl("/") + "#calculadora",
          }
        : active?.id === "offline" && routes[0]
          ? {
              label: "Continuar rota salva",
              detail: routes[0].origin + " → " + routes[0].destination,
              href: appUrl("/planejar") + "?rota=" + encodeURIComponent(routes[0].id) + "&origem=" + encodeURIComponent(routes[0].origin) + "&destino=" + encodeURIComponent(routes[0].destination),
            }
          : {
              label: "Planejar próxima viagem",
              detail: "Escolha origem e destino e salve para repetir depois.",
              href: appUrl("/planejar"),
            };

  const choose = (id: DailyModeId) => {
    setSelected(id);
    setSavedDailyMode(id);
    setExpanded(false);
  };

  return (
    <section className="container py-4 sm:py-6" aria-labelledby="daily-command-title">
      <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#111A21] shadow-[0_24px_70px_rgba(0,0,0,.24)]">
        <div className="border-b border-white/8 bg-[radial-gradient(circle_at_85%_0%,rgba(199,255,60,.11),transparent_34%),radial-gradient(circle_at_10%_100%,rgba(61,227,255,.08),transparent_30%)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7FF3C]/25 bg-[#C7FF3C]/8 px-2.5 py-1.5 text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#DFFF9A]">
                  <Sparkles className="size-3" /> Central de hoje
                </span>
                <span className={online ? "rounded-full border border-[#3DE3FF]/20 bg-[#3DE3FF]/7 px-2.5 py-1.5 text-[0.58rem] font-bold text-[#9BEFFF]" : "rounded-full border border-[#FFC928]/20 bg-[#FFC928]/7 px-2.5 py-1.5 text-[0.58rem] font-bold text-[#FFE08A]"}>
                  {online ? "online" : "offline"}
                </span>
              </div>
              <h2 id="daily-command-title" className="mt-3 font-display text-[clamp(2rem,7vw,3.8rem)] font-semibold leading-[.92] tracking-[-.065em] text-white">
                {favorite ? "Seu próximo deslocamento já está encaminhado." : "Deixe o Trajeto pronto para o seu dia."}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
                {favorite
                  ? "O modo automático usa seus destinos, viagens e rotas salvas para colocar a ação mais provável na frente."
                  : "Salve um destino, uma rota ou seu veículo. A partir daí, o Trajeto começa a preparar atalhos automaticamente neste aparelho."}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <a href={primary.href} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-5 text-xs font-black text-[#0B1014] transition hover:bg-white active:scale-[.98] sm:flex-none">
                {primary.label} <ArrowRight className="size-4" />
              </a>
              <button type="button" onClick={openAccessibility} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-xs font-bold text-white transition hover:border-[#3DE3FF]">
                <Accessibility className="size-4 text-[#3DE3FF]" /> Acessibilidade
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/8 bg-white/[.035] p-3">
              <MapPin className="size-4 text-[#3DE3FF]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[.1em] text-white/40">Destino</p>
              <p className="mt-1 truncate text-xs font-extrabold text-white">{favorite?.label ?? "Configurar"}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[.035] p-3">
              <Route className="size-4 text-[#BDA5FF]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[.1em] text-white/40">Rotas</p>
              <p className="mt-1 text-xs font-extrabold text-white">{routes.length ? routes.length + " salva" + (routes.length === 1 ? "" : "s") : "Nenhuma"}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[.035] p-3">
              <CarFront className="size-4 text-[#C7FF3C]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[.1em] text-white/40">Veículo</p>
              <p className="mt-1 truncate text-xs font-extrabold text-white">{vehicle?.name ?? "Configurar"}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[.035] p-3">
              <CheckCircle2 className="size-4 text-[#C7FF3C]" />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[.1em] text-white/40">Pronto</p>
              <p className="mt-1 text-xs font-extrabold text-white">{completed}/4 itens</p>
            </div>
          </div>
        </div>

        <div className="border-b border-white/8 px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.58rem] font-black uppercase tracking-[.14em] text-[#7F919A]">Modo atual</p>
              <p className="mt-1 text-sm font-extrabold text-white">{active?.label ?? "Automático"} <span className="font-normal text-white/45">· {active?.detail ?? "preparando sua próxima ação"}</span></p>
            </div>
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 text-[0.62rem] font-bold text-white">
              {expanded ? "Fechar modos" : "Trocar modo"}
            </button>
          </div>

          {expanded && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {modes.map(mode => {
                const Icon = modeIcon[mode.id];
                const isActive = mode.id === activeId;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => choose(mode.id)}
                    className={isActive
                      ? "min-h-16 rounded-xl border border-[#C7FF3C]/45 bg-[#C7FF3C]/10 p-3 text-left"
                      : "min-h-16 rounded-xl border border-white/8 bg-white/[.025] p-3 text-left transition hover:border-white/20"}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-white"><Icon className="size-3.5 text-[#3DE3FF]" />{mode.label}</span>
                    <span className="mt-1 block text-[0.58rem] leading-relaxed text-white/45">{mode.detail}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4">
          <a href={favorite ? appUrl("/planejar") + "?destino=" + encodeURIComponent(favorite.value) : appUrl("/planejar")} className="group min-h-24 border-r border-white/8 p-4 transition hover:bg-white/[.035]">
            <MapPin className="size-4 text-[#3DE3FF]" />
            <p className="mt-5 text-xs font-extrabold text-white">Meu destino</p>
            <p className="mt-1 text-[0.58rem] text-white/40">{favorite ? "Ir agora" : "Salvar destino"}</p>
          </a>
          <a href={lastTrip ? appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination) : appUrl("/planejar")} className="group min-h-24 border-r border-white/8 p-4 transition hover:bg-white/[.035]">
            <Route className="size-4 text-[#BDA5FF]" />
            <p className="mt-5 text-xs font-extrabold text-white">Repetir</p>
            <p className="mt-1 truncate text-[0.58rem] text-white/40">{lastTrip ? lastTrip.origin + " → " + lastTrip.destination : "Primeira viagem"}</p>
          </a>
          <a href={appUrl("/") + "#calculadora"} className="group min-h-24 border-r border-white/8 p-4 transition hover:bg-white/[.035]">
            <Fuel className="size-4 text-[#C7FF3C]" />
            <p className="mt-5 text-xs font-extrabold text-white">Economia</p>
            <p className="mt-1 text-[0.58rem] text-white/40">Custo e consumo</p>
          </a>
          <a href={appUrl("/planejar?salvos=1")} className="group min-h-24 p-4 transition hover:bg-white/[.035]">
            <WifiOff className="size-4 text-[#FFC928]" />
            <p className="mt-5 text-xs font-extrabold text-white">Offline</p>
            <p className="mt-1 text-[0.58rem] text-white/40">{routes.length ? "Continuar rota" : "Preparar rota"}</p>
          </a>
        </div>
      </div>
    </section>
  );
}

export { OPEN_ACCESSIBILITY_EVENT };
