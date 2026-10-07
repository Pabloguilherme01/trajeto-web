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
    setLocation(appUrl(automatic.href));
  };

  return (
    <section className="container py-3 sm:py-4" aria-labelledby="daily-modes-title">
      <div className="rounded-2xl border border-white/10 bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.15em] text-primary"><BatteryCharging className="size-3.5" /> Modos rápidos</p>
            <h2 id="daily-modes-title" className="mt-1 text-sm font-extrabold text-white">Escolha como quer usar o Trajeto hoje</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={chooseAutomatic} className={selected === "automatico" ? "min-h-11 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary" : "min-h-11 rounded-xl border border-white/10 px-3 text-xs font-bold text-primary"}>
              Automático: {autoMode === "proxima" ? "próxima viagem" : autoMode === "repetir" ? "repetir" : autoMode === "economia" ? "economia" : autoMode === "conducao" ? "condução" : "offline"}
            </button>
            <button type="button" aria-expanded={expanded} aria-controls="daily-modes-options" onClick={() => setExpanded(value => !value)} className="min-h-11 rounded-xl border border-white/10 px-3 text-xs font-bold text-white">
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
              <div key={mode.id} role="listitem" className="shrink-0">
              <button type="button" aria-pressed={activeMode} onClick={() => openMode(mode)} aria-label={mode.label} className={activeMode ? "min-h-14 min-w-[9.5rem] shrink-0 rounded-xl border border-primary/50 bg-primary/10 px-3 text-left" : "min-h-14 min-w-[9.5rem] shrink-0 rounded-xl border border-white/10 bg-white/[0.025] px-3 text-left"}>
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-white"><Icon className="size-3.5 text-accent" />{mode.label}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{mode.detail}</span>
              </button>
              </div>
            );
          })}
        </div>
        )}

        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground">Ação preparada</p>
            <p className="mt-1 truncate text-xs font-extrabold text-white">{active.label}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{active.detail}</p>
          </div>
          <button type="button" onClick={() => openMode(active)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground">
            Abrir <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
