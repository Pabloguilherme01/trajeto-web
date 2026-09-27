import { Battery, CloudOff, Compass, Gauge, LocateFixed, Navigation, Wifi, Signal, ShieldCheck, Bookmark, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getEconomyMode, getLastStation, getLastTrip, getRecentSearches, setEconomyMode, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { listOfflineRoutes, offlineRouteEvent } from "@/lib/offlineStore";
import { getFavoriteDestination, getDestinationUsage, getMobileDestinations, mobileDestinationEvent, rememberDestinationUsage, type MobileDestination } from "@/lib/mobileDestinations";

export default function MobileTravelHub() {
  const [, setLocation] = useLocation();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [battery, setBattery] = useState<number | null>(null);
  const [savedRoutes, setSavedRoutes] = useState(0);
  const [lastTrip, setLastTrip] = useState<{ origin: string; destination: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);
  const [economyMode, setEconomyModeState] = useState(getEconomyMode);
  const [networkType, setNetworkType] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [recentSearch, setRecentSearch] = useState<string | null>(() => getRecentSearches()[0] ?? null);
  const [lastStation, setLastStation] = useState(() => getLastStation());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [autoEconomyApplied, setAutoEconomyApplied] = useState(false);
  const [favoriteDestination, setFavoriteDestination] = useState<MobileDestination | null>(() => getFavoriteDestination());

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void } }).connection;
    const updateNetwork = () => setNetworkType(connection?.effectiveType ?? null);
    updateNetwork();
    connection?.addEventListener?.("change", updateNetwork);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const refreshRoutes = () => {
      void listOfflineRoutes().then(routes => setSavedRoutes(routes.length)).catch(() => {});
      setLastTrip(getLastTrip());
      setRecentSearch(getRecentSearches()[0] ?? null);
      setLastStation(getLastStation());
    setFavoriteDestination(getFavoriteDestination());
      setEconomyModeState(getEconomyMode());
      setFavoriteDestination(getFavoriteDestination(getMobileDestinations(), getDestinationUsage()));
    };

    window.addEventListener("focus", refreshRoutes);
    window.addEventListener(mobilePreferenceEvent, refreshRoutes);
    window.addEventListener(offlineRouteEvent, refreshRoutes);
    window.addEventListener(mobileDestinationEvent, refreshRoutes);

    let mounted = true;
    void listOfflineRoutes().then(routes => { if (mounted) setSavedRoutes(routes.length); }).catch(() => {});
    setLastTrip(getLastTrip());
    setRecentSearch(getRecentSearches()[0] ?? null);
    setLastStation(getLastStation());

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; addEventListener: (type: string, listener: () => void) => void; removeEventListener: (type: string, listener: () => void) => void }>;
    };
    let batteryDevice: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | undefined;
    let updateBatterySaver: (() => void) | undefined;
    const updateBattery = () => {
      if (batteryDevice && mounted) {
        const nextBattery = Math.round(batteryDevice.level * 100);
        setBattery(nextBattery);
        setBatterySaver(nextBattery <= 20);
      }
    };

    if (nav.getBattery) void nav.getBattery().then(device => {
      batteryDevice = device;
      updateBattery();
      updateBatterySaver = updateBattery;
      device.addEventListener("levelchange", updateBattery);
    }).catch(() => {});

    return () => {
      mounted = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("focus", refreshRoutes);
      window.removeEventListener(mobilePreferenceEvent, refreshRoutes);
      window.removeEventListener(offlineRouteEvent, refreshRoutes);
      window.removeEventListener(mobileDestinationEvent, refreshRoutes);
      connection?.removeEventListener?.("change", updateNetwork);
      batteryDevice?.removeEventListener("levelchange", updateBattery);
      if (batteryDevice && updateBatterySaver) batteryDevice.removeEventListener("levelchange", updateBatterySaver);
    };
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    const slowConnection = networkType === "slow-2g" || networkType === "2g";
    const criticalBattery = battery !== null && battery <= 20;
    if ((!criticalBattery && !slowConnection) || economyMode || autoEconomyApplied) return;
    setEconomyMode(true);
    setEconomyModeState(true);
    setAutoEconomyApplied(true);
    setStatusMessage(criticalBattery ? "Economia de dados ativada automaticamente para preservar a bateria." : "Economia de dados ativada para reduzir o uso em conexão lenta.");
  }, [battery, networkType, economyMode, autoEconomyApplied]);

  const readiness = [
    online,
    savedRoutes > 0 || Boolean(lastTrip),
    economyMode || !batterySaver,
    isStandalone,
  ].filter(Boolean).length;
  const readinessLabel = readiness === 4 ? "Pronto para sair" : readiness >= 3 ? "Quase pronto" : "Prepare o celular";

  const locate = () => {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      setLocating(false);
      setStatusMessage("Localização encontrada. Abrindo postos próximos.");
      setLocation(appUrl("/postos") + "?lat=" + position.coords.latitude + "&lng=" + position.coords.longitude + "&q=" + encodeURIComponent("postos próximos"));
    }, () => {
      setLocating(false);
      setStatusMessage("Não foi possível obter a localização. Você pode continuar com sua última busca.");
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 });
  };

  return (
    <section className="border-y border-white/8 bg-[linear-gradient(180deg,#101A21_0%,#0B1014_100%)] py-5 md:hidden">
      <div className="container">
        <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#111A21] p-4 shadow-[0_18px_50px_rgba(0,0,0,.2)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-[#3DE3FF]">Painel de viagem</p>
              <p className="mt-1 text-sm font-extrabold text-white">{online ? "Conectado e pronto" : "Modo offline ativo"}</p>
            </div>
            <div className="flex items-center gap-2">{networkType && online && <span className="hidden text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[#7F919A] sm:inline">{networkType}</span>}<div className={online ? "text-[#C7FF3C]" : "text-[#FFB86B]"}>{online ? <Wifi className="size-5" /> : <CloudOff className="size-5" />}</div></div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#3DE3FF]/20 bg-[linear-gradient(135deg,rgba(61,227,255,.08),rgba(199,255,60,.035))] p-3 shadow-[0_12px_35px_rgba(0,0,0,.12)]">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Próxima ação</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-white">{!online && savedRoutes > 0 ? "Use uma rota salva sem internet." : batterySaver && !economyMode ? "Ative a economia antes de sair." : lastTrip ? "Retome sua última viagem." : lastStation ? "Reabra o último posto." : recentSearch ? "Reabra sua última pesquisa." : "Encontre postos perto de você."}</p>
                <p className="mt-1 text-[0.62rem] leading-relaxed text-[#9EC8D2]">{!online && savedRoutes > 0 ? "O conteúdo local continua disponível neste aparelho." : batterySaver && !economyMode ? "Reduza consultas e carregamento de dados no celular." : lastTrip ? lastTrip.destination : lastStation ? lastStation.name : recentSearch ?? "Use o GPS para começar."}</p>
              </div>
              <button type="button" onClick={() => {
                if (!online && savedRoutes > 0) return setLocation(appUrl("/planejar") + "?salvos=1");
                if (batterySaver && !economyMode) { setEconomyMode(true); setEconomyModeState(true); return; }
                if (lastTrip) return setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination));
                if (lastStation) return setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(lastStation.query) + "&station=" + encodeURIComponent(lastStation.placeId));
                if (recentSearch) return setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(recentSearch));
                locate();
              }} className="min-h-10 shrink-0 rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-extrabold text-[#0B1014] active:scale-[.98]">
                {!online && savedRoutes > 0 ? "Abrir" : batterySaver && !economyMode ? "Ativar" : "Continuar"}
              </button>
            </div>
          </div>

          {favoriteDestination && (
            <div className="mt-3 rounded-2xl border border-[#C7FF3C]/20 bg-[linear-gradient(135deg,rgba(199,255,60,.08),rgba(61,227,255,.04))] p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-[#C7FF3C]">Seu destino</p>
                  <p className="mt-1 truncate text-xs font-extrabold text-white">{favoriteDestination.label}</p>
                  <p className="mt-0.5 truncate text-[0.62rem] text-[#9EC8D2]">{favoriteDestination.value}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => {
                    const updated = rememberDestinationUsage(favoriteDestination);
                    setFavoriteDestination(getFavoriteDestination(getMobileDestinations(), updated));
                    setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(favoriteDestination.value));
                  }} className="min-h-10 rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014] active:scale-[.98]">Ir agora</button>
                  <button type="button" onClick={() => {
                    const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(favoriteDestination.value);
                    window.open(url, "_blank", "noopener,noreferrer");
                  }} className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[0.62rem] font-bold text-white active:scale-[.98]">Navegar</button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#7F919A]"><Zap className="size-3 text-[#C7FF3C]" /> Prontidão da viagem</p>
                <p className="mt-1 text-xs font-extrabold text-white">{readinessLabel}</p>
              </div>
              <span className="text-sm font-black text-[#C7FF3C]">{readiness}/4</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div className="h-full rounded-full bg-[#C7FF3C] transition-all" style={{ width: `${(readiness / 4) * 100}%` }} />
            </div>
            <p className="mt-2 text-[0.6rem] leading-relaxed text-[#7F919A]">Conexão, rota local, economia e acesso rápido avaliados neste aparelho.</p>
          </div>

          {statusMessage && <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[0.05] px-3 py-2 text-[0.62rem] font-bold text-[#C9F7FF]">{statusMessage}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.58rem] font-bold ${online ? "border-[#C7FF3C]/25 bg-[#C7FF3C]/8 text-[#DFFF9D]" : "border-[#FFB86B]/30 bg-[#FFB86B]/8 text-[#FFD49C]"}`}><Signal className="size-3" /> {online ? (networkType ? networkType : "online") : "offline"}</span>
            {battery !== null && <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.58rem] font-bold ${battery <= 20 ? "border-[#FFB86B]/30 bg-[#FFB86B]/8 text-[#FFD49C]" : "border-white/10 bg-white/[0.03] text-[#A9BAC2]"}`}><Battery className="size-3" /> {battery}%</span>}
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.58rem] font-bold text-[#A9BAC2]"><ShieldCheck className="size-3 text-[#BDA5FF]" /> {isStandalone ? "app instalado" : "web app"}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => lastTrip ? setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination)) : recentSearch ? setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(recentSearch)) : locate()} className="min-h-11 rounded-xl border border-[#C7FF3C]/25 bg-[#C7FF3C]/[0.06] px-3 text-left text-xs font-extrabold text-[#DFFF9D] transition active:scale-[.98]">
              <Navigation className="mr-2 inline size-4 text-[#C7FF3C]" /> {lastTrip ? "Retomar viagem" : recentSearch ? "Reabrir busca" : "Começar agora"}
            </button>
            <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?salvos=1")} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-left text-xs font-bold text-white transition active:scale-[.98]">
              <Bookmark className="mr-2 inline size-4 text-[#3DE3FF]" /> Rotas e locais salvos
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?salvos=1")} className="rounded-xl border border-white/6 bg-white/[0.035] p-3 text-left transition active:scale-[.98]"><Navigation className="size-4 text-[#C7FF3C]" /><p className="mt-2 text-[0.65rem] text-[#7F919A]">Rotas salvas</p><p className="text-sm font-extrabold text-white">{savedRoutes}</p></button>
            <button type="button" onClick={() => { const next = !economyMode; setEconomyMode(next); setEconomyModeState(next); setAutoEconomyApplied(false); }} className="rounded-xl bg-white/[0.04] p-3 text-left transition active:scale-[.98]"><Gauge className="size-4 text-[#3DE3FF]" /><p className="mt-2 text-[0.65rem] text-[#7F919A]">Economia</p><p className="text-sm font-extrabold text-white">{economyMode ? "Ativa" : "Normal"}</p></button>
            <div className="rounded-xl bg-white/[0.04] p-3"><Compass className="size-4 text-[#BDA5FF]" /><p className="mt-2 text-[0.65rem] text-[#7F919A]">Modo</p><p className="text-sm font-extrabold text-white">{online ? "Online" : "Offline"}</p></div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={locate} className="min-h-11 rounded-xl border border-white/12 bg-white/[0.025] text-xs font-bold text-white transition active:scale-[.98]" disabled={locating}><LocateFixed className="mr-2 inline size-4 text-[#3DE3FF]" />{locating ? "Localizando…" : "Perto de mim"}</button>
            <button type="button" onClick={() => { if (!lastStation) return setLocation(appUrl("/planejar") + "?salvos=1"); const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(lastStation.address); window.open(url, "_blank", "noopener,noreferrer"); }} className="min-h-11 rounded-xl border border-white/12 bg-white/[0.025] px-2 text-xs font-bold text-white transition active:scale-[.98]"><Bookmark className="mr-2 inline size-4 text-[#3DE3FF]" />{lastStation ? "Navegar ao último posto" : "Salvos"}</button>
            <button type="button" onClick={() => setLocation(appUrl("/planejar"))} className="min-h-11 rounded-xl bg-[#C7FF3C] text-xs font-extrabold text-[#0B1014] shadow-[0_8px_20px_rgba(199,255,60,.12)] transition active:scale-[.98]"><Navigation className="mr-2 inline size-4" />Planejar</button>
          </div>
        </div>
      </div>
    </section>
  );
}
