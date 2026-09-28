import { useEffect, useState } from "react";
import { Compass, History, Home, Navigation } from "lucide-react";
import { appUrl } from "@/lib/appUrl";
import { getAutomaticDailyMode, getSavedDailyMode, setSavedDailyMode, type DailyModeId } from "@/lib/dailyModes";
import { getFavoriteDestination, getDestinationUsage, getMobileDestinations } from "@/lib/mobileDestinations";
import { getLastTrip } from "@/lib/mobilePreferences";
import { listOfflineRoutes } from "@/lib/offlineStore";

export default function MobileQuickBar() {
  const [mode, setMode] = useState<DailyModeId>(() => getSavedDailyMode() ?? "automatico");
  const [autoMode, setAutoMode] = useState<DailyModeId>("proxima");
  const [routeHref, setRouteHref] = useState(appUrl("/planejar"));

  useEffect(() => {
    const refresh = () => {
      void listOfflineRoutes().then(routes => {
        const online = navigator.onLine;
        setAutoMode(getAutomaticDailyMode(online, routes.length));
        const saved = getSavedDailyMode() ?? "automatico";
        setMode(saved);
        const favorite = getFavoriteDestination(getMobileDestinations(), getDestinationUsage());
        const trip = getLastTrip();
        if (!online && routes[0]) setRouteHref(appUrl("/planejar") + "?rota=" + encodeURIComponent(routes[0].id) + "&origem=" + encodeURIComponent(routes[0].origin) + "&destino=" + encodeURIComponent(routes[0].destination));
        else if ((saved === "repetir" || (saved === "automatico" && getAutomaticDailyMode(online, routes.length) === "repetir")) && trip) setRouteHref(appUrl("/planejar") + "?origem=" + encodeURIComponent(trip.origin) + "&destino=" + encodeURIComponent(trip.destination));
        else if (favorite) setRouteHref(appUrl("/planejar") + "?destino=" + encodeURIComponent(favorite.value));
        else setRouteHref(appUrl("/planejar"));
      }).catch(() => setRouteHref(appUrl("/planejar")));
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  const automatic = mode === "automatico";
  const activeLabel = automatic
    ? autoMode === "repetir" ? "Repetir" : autoMode === "offline" ? "Continuar" : "Ir"
    : mode === "repetir" ? "Repetir" : mode === "offline" ? "Salvos" : mode === "economia" ? "Custo" : "Ir";

  return (
    <nav aria-label="Atalhos móveis" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0B1014]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        <a href={appUrl("/")} className="flex min-h-12 flex-col items-center justify-center rounded-xl text-[0.58rem] font-bold text-white/65"><Home className="size-4" /><span>Início</span></a>
        <a href={routeHref} onClick={() => { if (mode === "automatico") setSavedDailyMode("automatico"); }} className="flex min-h-12 flex-col items-center justify-center rounded-xl bg-[#C7FF3C] text-[0.58rem] font-black text-[#0B1014]"><Navigation className="size-4" /><span>{activeLabel}</span></a>
        <a href={appUrl("/planejar?salvos=1")} className="flex min-h-12 flex-col items-center justify-center rounded-xl text-[0.58rem] font-bold text-white/65"><History className="size-4" /><span>Salvos</span></a>
        <button type="button" onClick={() => { const next: DailyModeId = mode === "automatico" ? "proxima" : "automatico"; setMode(next); setSavedDailyMode(next); }} className="flex min-h-12 flex-col items-center justify-center rounded-xl text-[0.58rem] font-bold text-white/65" aria-label="Alternar modo rápido"><Compass className="size-4" /><span>{automatic ? "Modo" : "Auto"}</span></button>
      </div>
    </nav>
  );
}
