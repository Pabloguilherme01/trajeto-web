import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, Clock3, MapPin, Navigation, Search, Wifi, WifiOff } from "lucide-react";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import { getFavoriteDestination, getMobileDestinations, mobileDestinationEvent, rememberDestinationUsage, type MobileDestination } from "@/lib/mobileDestinations";
import { getLastTrip, getRecentSearches, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { listOfflineRoutes, offlineRouteEvent } from "@/lib/offlineStore";
import { getMobileVehicle, mobileVehicleEvent } from "@/lib/mobileVehicle";

export default function TodayPulse() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [lastTrip, setLastTrip] = useState(() => getLastTrip());
  const [favorite, setFavorite] = useState<MobileDestination | null>(() => getFavoriteDestination());
  const [recentSearch, setRecentSearch] = useState(() => getRecentSearches()[0] ?? "");
  const [savedRoutes, setSavedRoutes] = useState(0);
  const [destinationCount, setDestinationCount] = useState(() => getMobileDestinations().length);
  const [vehicleName, setVehicleName] = useState(() => getMobileVehicle()?.name ?? "");

  useEffect(() => {
    const refresh = () => {
      setLastTrip(getLastTrip());
      setFavorite(getFavoriteDestination());
      setRecentSearch(getRecentSearches()[0] ?? "");
      void listOfflineRoutes().then(routes => setSavedRoutes(routes.length)).catch(() => setSavedRoutes(0));
      setDestinationCount(getMobileDestinations().length);
      setVehicleName(getMobileVehicle()?.name ?? "");
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(mobileDestinationEvent, refresh);
    window.addEventListener(mobileVehicleEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(mobileDestinationEvent, refresh);
      window.removeEventListener(mobileVehicleEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
    };
  }, []);

  const shareLastTrip = () => {
    if (!lastTrip) return;
    const url = `${window.location.origin}${appUrl("/planejar")}?origem=${encodeURIComponent(lastTrip.origin)}&destino=${encodeURIComponent(lastTrip.destination)}`;
    void shareText(`Minha rota no Trajeto: ${lastTrip.origin} → ${lastTrip.destination}.`, url, "Trajeto");
  };

  const readiness = lastTrip
    ? online ? (savedRoutes > 0 ? "pronto + offline" : "pronto para calcular")
      : savedRoutes > 0 ? "pronto offline" : "conexão necessária"
    : "primeira viagem";

  return (
    <section className="border-b border-white/8 bg-[#0A1116] py-4 sm:py-7 md:hidden" aria-labelledby="today-pulse-title">
      <div className="container">
        <div className="rounded-3xl border border-white/8 bg-[#10181F] p-4 shadow-[0_16px_42px_rgba(0,0,0,.2)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p id="today-pulse-title" className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#3DE3FF]">Seu Trajeto hoje</p>
                <span className={online ? "inline-flex items-center gap-1.5 rounded-full bg-[#C7FF3C]/10 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#C7FF3C]" : "inline-flex items-center gap-1.5 rounded-full bg-[#FFB86B]/10 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#FFD39D]"}>
                  {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}{online ? "online" : "offline"}
                </span>
              </div>
              <h2 className="mt-2 truncate text-sm font-black text-white">{lastTrip ? `${lastTrip.origin} → ${lastTrip.destination}` : favorite ? favorite.value : "Prepare sua próxima saída"}</h2>
              <p className="mt-1 text-[0.62rem] leading-relaxed text-[#7F919A]">{readiness}{vehicleName ? ` · ${vehicleName}` : ""}</p>
            </div>
            {lastTrip ? (
              <button type="button" onClick={shareLastTrip} className="mobile-pressable shrink-0 rounded-xl border border-white/10 px-3 text-[0.58rem] font-black text-white/70">Enviar</button>
            ) : (
              <Navigation className="mt-1 size-5 shrink-0 text-[#C7FF3C]" aria-hidden="true" />
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={lastTrip ? appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination) : appUrl("/planejar")} className="mobile-pressable rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014]">
              {lastTrip ? "Repetir viagem" : "Planejar agora"}<ArrowRight className="size-3.5" />
            </a>
            <a href={favorite ? appUrl("/planejar") + "?destino=" + encodeURIComponent(favorite.value) : appUrl("/postos")} onClick={() => { if (favorite) rememberDestinationUsage(favorite); }} className="mobile-pressable rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[0.62rem] font-black text-white/75">
              {favorite ? "Meu destino" : "Encontrar postos"}<MapPin className="size-3.5 text-[#3DE3FF]" />
            </a>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <span className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5"><Bookmark className="size-3.5 text-[#C7FF3C]" /><span className="mt-1 block text-[0.52rem] font-black text-white/45">{savedRoutes} offline</span></span>
            <span className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5"><MapPin className="size-3.5 text-[#3DE3FF]" /><span className="mt-1 block truncate text-[0.52rem] font-black text-white/45">{destinationCount} destino(s)</span></span>
            <a href={recentSearch ? appUrl("/postos") + "?q=" + encodeURIComponent(recentSearch) : appUrl("/postos")} className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5"><Search className="size-3.5 text-[#BDA5FF]" /><span className="mt-1 block truncate text-[0.52rem] font-black text-white/45">{recentSearch || "Nova busca"}</span></a>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[0.52rem] text-white/35">
            <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3" /> Dados deste aparelho</span>
            {lastTrip && <a href={appUrl("/planejar") + "?salvos=1"} className="font-black text-[#C7FF3C]">Ver salvos</a>}
          </div>
        </div>
      </div>
    </section>
  );
}
