import React from "react";
import { ArrowRight, CalendarClock, Gauge, Navigation, Sparkles, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { getAutomaticDailyMode } from "@/lib/dailyModes";
import { getDestinationUsage, getFavoriteDestination, getMobileDestinations, mobileDestinationEvent } from "@/lib/mobileDestinations";
import { getEconomyMode, getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";

const labels = {
  proxima: { title: "Sua próxima viagem", icon: Navigation },
  repetir: { title: "Repetir última viagem", icon: CalendarClock },
  economia: { title: "Economizar na viagem", icon: Gauge },
  offline: { title: "Continuar sem internet", icon: WifiOff },
} as const;

export default function DailyNowCard() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [savedRoutes, setSavedRoutes] = useState<OfflineRoute[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      void listOfflineRoutes().then(setSavedRoutes).catch(() => setSavedRoutes([]));
      setTick(value => value + 1);
    };
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(mobileDestinationEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(mobileDestinationEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
    };
  }, []);

  const context = useMemo(() => {
    void tick;
    const favorite = getFavoriteDestination(getMobileDestinations(), getDestinationUsage());
    const lastTrip = getLastTrip();
    const mode = getAutomaticDailyMode(online, savedRoutes.length);
    const href = mode === "repetir" && lastTrip
      ? appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination)
      : mode === "proxima" && favorite
        ? appUrl("/planejar") + "?destino=" + encodeURIComponent(favorite.value)
        : mode === "economia"
          ? appUrl("/") + "#calculadora"
          : savedRoutes[0]
            ? appUrl("/planejar") + "?rota=" + encodeURIComponent(savedRoutes[0].id) + "&origem=" + encodeURIComponent(savedRoutes[0].origin) + "&destino=" + encodeURIComponent(savedRoutes[0].destination)
            : appUrl("/planejar");
    const fallbackTitle = favorite ? favorite.label + " está pronto" : lastTrip ? "Sua última viagem está pronta" : "Prepare sua próxima viagem";
    return {
      mode,
      title: mode === "automatico" ? fallbackTitle : labels[mode as keyof typeof labels]?.title ?? fallbackTitle,
      detail: mode === "repetir" && lastTrip
        ? lastTrip.origin + " → " + lastTrip.destination
        : mode === "proxima" && favorite
          ? favorite.value
          : mode === "economia"
            ? "Veja custo, consumo e impacto antes de sair."
            : savedRoutes.length
              ? savedRoutes.length + (savedRoutes.length === 1 ? " rota salva neste aparelho." : " rotas salvas neste aparelho.")
              : "Uma ação rápida para deixar a viagem pronta.",
      href,
    };
  }, [online, savedRoutes, tick]);

  const Icon = context.mode === "automatico" ? Sparkles : labels[context.mode as keyof typeof labels]?.icon ?? Navigation;

  return (
    <section className="container py-3 sm:py-5" aria-labelledby="daily-now-title">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-[#C7FF3C]/20 bg-[linear-gradient(135deg,#121B22,#0F2026)] p-4 shadow-[0_18px_50px_rgba(0,0,0,.2)] sm:p-5">
        <div className="absolute -right-10 -top-10 size-28 rounded-full bg-[#C7FF3C]/8 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[0.58rem] font-extrabold uppercase tracking-[0.15em] text-[#C7FF3C]"><Sparkles className="size-3.5" /> Pronto para hoje</p>
            <h2 id="daily-now-title" className="mt-1 text-lg font-extrabold text-white">{context.title}</h2>
            <p className="mt-1 truncate text-xs text-[#A9BAC2]">{context.detail}</p>
            <p className="mt-2 text-[0.58rem] font-semibold text-[#71858E]">{getEconomyMode() ? "Economia ativada · " : ""}{online ? "conectado" : "modo offline"}</p>
          </div>
          <a href={context.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]">
            <Icon className="size-4" /> Abrir agora <ArrowRight className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
