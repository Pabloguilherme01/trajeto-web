import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BatteryCharging, CalendarClock, CarFront, Compass, Gauge, Sparkles, WifiOff } from "lucide-react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { buildDailyModes, getAutomaticDailyMode, getSavedDailyMode, setSavedDailyMode, type DailyModeId } from "@/lib/dailyModes";
import { mobileDestinationEvent } from "@/lib/mobileDestinations";
import { mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { offlineRouteEvent, listOfflineRoutes } from "@/lib/offlineStore";

const icons = { automatico: Sparkles, proxima: Compass, repetir: CalendarClock, economia: Gauge, offline: WifiOff, conducao: CarFront };

export default function DailyModeSelector() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [savedRoutes, setSavedRoutes] = useState(0);
  const [selected, setSelected] = useState<DailyModeId>(() => getSavedDailyMode() ?? "automatico");
  const [autoMode, setAutoMode] = useState<DailyModeId>(() => getAutomaticDailyMode(online, 0));
  const [expanded, setExpanded] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      void listOfflineRoutes().then(routes => {
        setSavedRoutes(routes.length);
        setAutoMode(getAutomaticDailyMode(navigator.onLine, routes.length));
      }).catch(() => {
        setSavedRoutes(0);
        setAutoMode(getAutomaticDailyMode(navigator.onLine, 0));
      });
    };
    const network = () => refresh();
    refresh();
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(mobileDestinationEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    return () => {
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(mobileDestinationEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
    };
  }, []);

  const modes = useMemo(() => buildDailyModes(online, savedRoutes), [online, savedRoutes]);
  const activeId = selected === "automatico" ? autoMode : selected;
  const active = modes.find(mode => mode.id === activeId) ?? modes[0];
  const automatic = modes.find(mode => mode.id === autoMode) ?? modes[0];
  if (!active || !automatic) return null;

  const openMode = (mode: { id: DailyModeId; href: string }) => {
    setSelected(mode.id);
    setSavedDailyMode(mode.id);
    setExpanded(false);
    setLocation(appUrl(mode.href));
  };

  const chooseAutomatic = () => {
    setSelected("automatico");
    setSavedDailyMode("automatico");
    setExpanded(false);
    setLocation(appUrl(active?.href ?? automatic.href));
  };

  return (
    <section className="container py-3 sm:py-4" aria-labelledby="daily-modes-title">
      <div className="rounded-2xl border border-white/10 bg-[#121B22] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[0.58rem] font-extrabold uppercase tracking-[0.15em] text-[#C7FF3C]"><BatteryCharging className="size-3.5" /> Modos rápidos</p>
            <h2 id="daily-modes-title" className="mt-1 text-sm font-extrabold text-white">Escolha como quer usar o Trajeto hoje</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={chooseAutomatic} className={selected === "automatico" ? "min-h-10 rounded-xl border border-[#C7FF3C]/40 bg-[#C7FF3C]/10 px-3 text-[0.62rem] font-bold text-[#DFFF9A]" : "min-h-10 rounded-xl border border-white/10 px-3 text-[0.62rem] font-bold text-[#DFFF9A]"}>
              Automático: {autoMode === "proxima" ? "próxima viagem" : autoMode === "repetir" ? "repetir" : autoMode === "economia" ? "economia" : autoMode === "conducao" ? "condução" : "offline"}
            </button>
            <button type="button" aria-expanded={expanded} aria-controls="daily-modes-options" onClick={() => setExpanded(value => !value)} className="min-h-10 rounded-xl border border-white/10 px-3 text-[0.62rem] font-bold text-white">
              {expanded ? "Fechar" : "Trocar modo"}
            </button>
          </div>
        </div>

        {expanded && (
          <div id="daily-modes-options" className="mt-3 flex gap-2 overflow-x-auto pb-1" role="list">
          {modes.map(mode => {
            const Icon = icons[mode.id];
            const activeMode = mode.id === activeId;
            return (
              <button key={mode.id} type="button" role="listitem" aria-pressed={activeMode} onClick={() => openMode(mode)} className={activeMode ? "min-h-14 min-w-[9.5rem] shrink-0 rounded-xl border border-[#C7FF3C]/50 bg-[#C7FF3C]/10 px-3 text-left" : "min-h-14 min-w-[9.5rem] shrink-0 rounded-xl border border-white/10 bg-white/[0.025] px-3 text-left"}>
                <span className="flex items-center gap-1.5 text-[0.64rem] font-extrabold text-white"><Icon className="size-3.5 text-[#3DE3FF]" />{mode.label}</span>
                <span className="mt-1 block truncate text-[0.58rem] text-[#82939C]">{mode.detail}</span>
              </button>
            );
          })}
        </div>
        )}

        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.13em] text-[#7F919A]">Ação preparada</p>
            <p className="mt-1 truncate text-xs font-extrabold text-white">{active.label}</p>
            <p className="mt-0.5 truncate text-[0.62rem] text-[#7F919A]">{active.detail}</p>
          </div>
          <button type="button" onClick={() => openMode(active)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014]">
            Abrir <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
