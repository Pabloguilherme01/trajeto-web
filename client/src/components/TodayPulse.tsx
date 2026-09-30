import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, Clock3, MapPin, Navigation, Search, Wifi, WifiOff } from "lucide-react";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import { getFavoriteDestination, getMobileDestinations, mobileDestinationEvent, rememberDestinationUsage, type MobileDestination } from "@/lib/mobileDestinations";
import { getLastTrip, getRecentSearches, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";
import { getMobileVehicle, mobileVehicleEvent } from "@/lib/mobileVehicle";

export default function TodayPulse() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [lastTrip, setLastTrip] = useState(() => getLastTrip());
  const [favorite, setFavorite] = useState<MobileDestination | null>(() => getFavoriteDestination());
  const [recentSearch, setRecentSearch] = useState(() => getRecentSearches()[0] ?? "");
  const [savedRoutes, setSavedRoutes] = useState<OfflineRoute[]>([]);
  const [destinationCount, setDestinationCount] = useState(() => getMobileDestinations().length);
  const [vehicleName, setVehicleName] = useState(() => getMobileVehicle()?.name ?? "");

  useEffect(() => {
    const refresh = () => {
      setLastTrip(getLastTrip());
      setFavorite(getFavoriteDestination());
      setRecentSearch(getRecentSearches()[0] ?? "");
      void listOfflineRoutes().then(setSavedRoutes).catch(() => setSavedRoutes([]));
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

  const openFavorite = () => {
    if (!favorite) return;
    rememberDestinationUsage(favorite);
  };

  const shareLastTrip = () => {
    if (!lastTrip) return;
    const url = `${window.location.origin}${appUrl("/planejar")}?origem=${encodeURIComponent(lastTrip.origin)}&destino=${encodeURIComponent(lastTrip.destination)}`;
    void shareText(`Minha rota no Trajeto: ${lastTrip.origin} → ${lastTrip.destination}.`, url, "Trajeto");
  };

  const readiness = lastTrip
    ? online
      ? savedRoutes.length > 0 ? "pronto + offline" : "pronto para calcular"
      : savedRoutes.length > 0 ? "pronto offline" : "conexão necessária"
    : "primeira viagem";

  return (
    <section className="border-b border-white/8 bg-[#0A1116] py-4 sm:py-7 md:hidden" aria-labelledby="today-pulse-title">
      <div className="container">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p id="today-pulse-title" className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#3DE3FF]">Seu Trajeto hoje</p>
              <span className={online ? "inline-flex items-center gap-1.5 rounded-full bg-[#C7FF3C]/10 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#C7FF3C]" : "inline-flex items-center gap-1.5 rounded-full bg-[#FFB86B]/10 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#FFD39D]"}>
                {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                {online ? "online" : "offline"}
              </span>
              {savedRoutes.length > 0 && <span className="rounded-full bg-white/[0.04] px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-white/45">{savedRoutes.length} salva{savedRoutes.length === 1 ? "" : "s"}</span>}
              {destinationCount > 0 && <span className="rounded-full bg-white/[0.04] px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-white/45">{destinationCount} destino{destinationCount === 1 ? "" : "s"}</span>}
              {vehicleName && <span className="hidden rounded-full bg-[#BDA5FF]/10 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#DCCFFF] sm:inline-block">veículo · {vehicleName}</span>}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#9FB0B8]">
              {lastTrip
                ? <><strong className="text-white">Última viagem:</strong> {lastTrip.origin} → {lastTrip.destination}</>
                : favorite
                  ? <>Destino principal pronto: <strong className="text-white">{favorite.label}</strong> · {favorite.value}</>
                  : "Configure um destino ou planeje sua primeira viagem."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:min-w-[34rem]">
            <a
              href={lastTrip ? appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination) : appUrl("/planejar")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014] transition hover:bg-white active:scale-[.98]"
            >
              <Navigation className="size-4" />
              {lastTrip ? "Repetir" : "Planejar"}
            </a>
            <a
              href={favorite ? appUrl("/planejar") + "?destino=" + encodeURIComponent(favorite.value) : appUrl("/planejar")}
              onClick={openFavorite}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[0.62rem] font-black text-white/80 transition hover:border-[#3DE3FF] active:scale-[.98]"
            >
              <MapPin className="size-4 text-[#3DE3FF]" />
              {favorite ? "Meu destino" : "Destino"}
            </a>
            <a
              href={savedRoutes[0] ? appUrl("/planejar") + "?rota=" + encodeURIComponent(savedRoutes[0].id) + "&origem=" + encodeURIComponent(savedRoutes[0].origin) + "&destino=" + encodeURIComponent(savedRoutes[0].destination) : appUrl("/planejar?salvos=1")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[0.62rem] font-black text-white/80 transition hover:border-[#C7FF3C]/40 active:scale-[.98]"
            >
              <Bookmark className="size-4 text-[#C7FF3C]" />
              Salvas
            </a>
            <a
              href={recentSearch ? appUrl("/postos") + "?q=" + encodeURIComponent(recentSearch) : appUrl("/postos")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[0.62rem] font-black text-white/80 transition hover:border-[#BDA5FF]/40 active:scale-[.98]"
            >
              <Search className="size-4 text-[#BDA5FF]" />
              {recentSearch ? "Última busca" : "Postos"}
            </a>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[#C7FF3C]/15 bg-[#C7FF3C]/[0.045] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[0.48rem] font-black uppercase tracking-[0.14em] text-[#C7FF3C]">Preparação</p>
            <p className="mt-0.5 truncate text-[0.62rem] font-extrabold text-white" aria-live="polite">{readiness}</p>
          </div>
          {lastTrip && <button type="button" onClick={shareLastTrip} className="mobile-pressable inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 px-3 text-[0.58rem] font-black text-white/75">Enviar rota</button>}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <Clock3 className="size-4 text-[#C7FF3C]" />
            <p className="mt-1.5 text-[0.5rem] font-black uppercase tracking-[0.12em] text-white/35">Histórico</p>
            <p className="mt-0.5 truncate text-[0.62rem] font-extrabold text-white">{lastTrip ? "pronto para repetir" : "sem viagens"}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <Bookmark className="size-4 text-[#3DE3FF]" />
            <p className="mt-1.5 text-[0.5rem] font-black uppercase tracking-[0.12em] text-white/35">Offline</p>
            <p className="mt-0.5 truncate text-[0.62rem] font-extrabold text-white">{savedRoutes.length ? `${savedRoutes.length} rota${savedRoutes.length === 1 ? "" : "s"}` : "nenhuma rota"}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <MapPin className="size-4 text-[#BDA5FF]" />
            <p className="mt-1.5 text-[0.5rem] font-black uppercase tracking-[0.12em] text-white/35">Destino</p>
            <p className="mt-0.5 truncate text-[0.62rem] font-extrabold text-white">{favorite?.label ?? "não definido"}</p>
          </div>
          <a href={appUrl("/ajuda")} className="hidden rounded-xl border border-white/8 bg-white/[0.025] p-3 transition hover:border-white/20 sm:block">
            <ArrowRight className="size-4 text-[#9FB0B8]" />
            <p className="mt-1.5 text-[0.5rem] font-black uppercase tracking-[0.12em] text-white/35">Ajuda</p>
            <p className="mt-0.5 text-[0.62rem] font-extrabold text-white">Como funciona</p>
          </a>
        </div>
      </div>
    </section>
  );
}
