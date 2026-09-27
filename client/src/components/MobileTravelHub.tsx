import { Battery, CloudOff, Compass, Gauge, LocateFixed, Navigation, Wifi, Signal, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getEconomyMode, getLastTrip, getRecentSearches, setEconomyMode, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { listOfflineRoutes } from "@/lib/offlineStore";

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
      setEconomyModeState(getEconomyMode());
    };
    window.addEventListener("focus", refreshRoutes);
    window.addEventListener(mobilePreferenceEvent, refreshRoutes);

    let mounted = true;
    void listOfflineRoutes().then(routes => { if (mounted) setSavedRoutes(routes.length); }).catch(() => {});
    if (mounted) {
      setLastTrip(getLastTrip());
      setRecentSearch(getRecentSearches()[0] ?? null);
    }

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; addEventListener: (type: string, listener: () => void) => void; removeEventListener: (type: string, listener: () => void) => void }>;
    };
    let batteryDevice: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | undefined;
    let updateBatterySaver: (() => void) | undefined;
    const updateBattery = () => { if (batteryDevice && mounted) setBattery(Math.round(batteryDevice.level * 100)); };
    if (nav.getBattery) void nav.getBattery().then(device => {
      batteryDevice = device;
      updateBattery();
      setBatterySaver(device.level <= 0.2);
      updateBatterySaver = () => setBatterySaver(device.level <= 0.2);
      device.addEventListener("levelchange", updateBattery);
      device.addEventListener("levelchange", updateBatterySaver);
    }).catch(() => {});

    return () => {
      mounted = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("focus", refreshRoutes);
      window.removeEventListener(mobilePreferenceEvent, refreshRoutes);
      connection?.removeEventListener?.("change", updateNetwork);
      batteryDevice?.removeEventListener("levelchange", updateBattery);
      if (batteryDevice && updateBatterySaver) batteryDevice.removeEventListener("levelchange", updateBatterySaver);
    };
  }, []);

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
      setLocation(appUrl("/postos") + "?lat=" + position.coords.latitude + "&lng=" + position.coords.longitude + "&q=" + encodeURIComponent("postos próximos"));
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 });
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
                <p className="text-xs font-extrabold text-white">{!online && savedRoutes > 0 ? "Use uma rota salva sem internet." : batterySaver && !economyMode ? "Ative a economia antes de sair." : lastTrip ? "Retome sua última viagem." : recentSearch ? "Reabra sua última pesquisa." : "Encontre postos perto de você."}</p>
                <p className="mt-1 text-[0.62rem] leading-relaxed text-[#9EC8D2]">{!online && savedRoutes > 0 ? "O conteúdo local continua disponível neste aparelho." : batterySaver && !economyMode ? "Reduza consultas e carregamento de dados no celular." : lastTrip ? lastTrip.destination : recentSearch ?? "Use o GPS para começar."}</p>
              </div>
              <button type="button" onClick={() => {
                if (!online && savedRoutes > 0) return setLocation(appUrl("/postos") + "?salvos=1");
                if (batterySaver && !economyMode) { setEconomyMode(true); setEconomyModeState(true); return; }
                if (lastTrip) return setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination));
                if (recentSearch) return setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(recentSearch));
                locate();
              }} className="min-h-10 shrink-0 rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-extrabold text-[#0B1014] active:scale-[.98]">
                {!online && savedRoutes > 0 ? "Abrir" : batterySaver && !economyMode ? "Ativar" : "Continuar"}
              </button>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[#7F919A]">Prontidão da viagem</p>
                <p className="mt-1 text-xs font-extrabold text-white">{readinessLabel}</p>
              </div>
              <span className="text-sm font-black text-[#C7FF3C]">{readiness}/4</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div className="h-full rounded-full bg-[#C7FF3C] transition-all" style={{ width: `${(readiness / 4) * 100}%` }} />
            </div>
            <p className="mt-2 text-[0.6rem] leading-relaxed text-[#7F919A]">Conexão, rota local, economia e acesso rápido avaliados neste aparelho.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.58rem] font-bold ${online ? "border-[#C7FF3C]/25 bg-[#C7FF3C]/8 text-[#DFFF9D]" : "border-[#FFB86B]/30 bg-[#FFB86B]/8 text-[#FFD49C]"}`}><Signal className="size-3" /> {online ? (networkType ? networkType : "online") : "offline"}</span>{battery !== null && <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.58rem] font-bold ${battery <= 20 ? "border-[#FFB86B]/30 bg-[#FFB86B]/8 text-[#FFD49C]" : "border-white/10 bg-white/[0.03] text-[#A9BAC2]"}`}><Battery className="size-3" /> {battery}%</span>}<span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.58rem] font-bold text-[#A9BAC2]"><ShieldCheck className="size-3 text-[#BDA5FF]" /> {isStandalone ? "app instalado" : "web app"}</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setLocation(appUrl("/postos") + "?salvos=1")} className="rounded-xl border border-white/6 bg-white/[0.035] p-3 text-left transition active:scale-[.98]"><Navigation className="size-4 text-[#C7FF3C]" /><p className="mt-2 text-[0.65rem] text-[#7F919A]">Rotas salvas</p><p className="text-sm font-extrabold text-white">{savedRoutes}</p></button>
            <button type="button" onClick={() => { const next = !economyMode; setEconomyMode(next); setEconomyModeState(next); }} className="rounded-xl bg-white/[0.04] p-3 text-left transition active:scale-[.98]"><Gauge className="size-4 text-[#3DE3FF]" /><p className="mt-2 text-[0.65rem] text-[#7F919A]">Economia</p><p className="text-sm font-extrabold text-white">{economyMode ? "Ativa" : "Normal"}</p></button>
            <div className="rounded-xl bg-white/[0.04] p-3"><Compass className="size-4 text-[#BDA5FF]" /><p className="mt-2 text-[0.65rem] text-[#7F919A]">Modo</p><p className="text-sm font-extrabold text-white">{online ? "Online" : "Offline"}</p></div>
          </div>
          {lastTrip && <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination))} className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#C7FF3C]/25 bg-[#C7FF3C]/[0.06] px-3 text-left transition active:scale-[.99]"><span className="min-w-0"><span className="block text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[#C7FF3C]">Continuar viagem</span><span className="mt-1 block truncate text-xs font-bold text-white">{lastTrip.origin} → {lastTrip.destination}</span><span className="mt-1 block text-[0.58rem] font-semibold text-[#8FA3AA]">Retomar planejamento</span></span><Navigation className="size-4 shrink-0 text-[#C7FF3C]" /></button>}
          {batterySaver && <div role="status" className="mt-3 flex items-center gap-3 rounded-xl border border-[#FFB86B]/25 bg-[#FFB86B]/[0.06] px-3 py-2 text-[0.65rem] font-bold leading-relaxed text-[#FFD49C]"><span className="min-w-0 flex-1">Bateria abaixo de 20%. Reduza o carregamento durante a viagem.</span><button type="button" onClick={() => { setEconomyMode(true); setEconomyModeState(true); }} disabled={economyMode} className="min-h-9 shrink-0 rounded-lg border border-[#FFB86B]/40 px-2.5 text-[0.6rem] font-extrabold text-[#FFD49C]">{economyMode ? "Ativo" : "Ativar"}</button></div>}
          {recentSearch && <button type="button" onClick={() => setLocation(appUrl("/postos") + "?q=" + encodeURIComponent(recentSearch))} className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[0.05] px-3 text-left transition active:scale-[.99]"><span className="min-w-0"><span className="block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#3DE3FF]">Última busca</span><span className="mt-1 block truncate text-xs font-bold text-white">{recentSearch}</span></span><Compass className="size-4 shrink-0 text-[#3DE3FF]" /></button>}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={locate} className="min-h-11 rounded-xl border border-white/12 bg-white/[0.025] text-xs font-bold text-white transition active:scale-[.98]" disabled={locating}><LocateFixed className="mr-2 inline size-4 text-[#3DE3FF]" />{locating ? "Localizando…" : "Perto de mim"}</button>
            <button type="button" onClick={() => { const next = !economyMode; setEconomyMode(next); setEconomyModeState(next); }} className={`min-h-11 rounded-xl border text-xs font-bold transition active:scale-[.98] ${economyMode ? "border-[#C7FF3C]/45 bg-[#C7FF3C]/10 text-[#DFFF9D]" : "border-white/12 bg-white/[0.025] text-white"}`}><Gauge className="mr-2 inline size-4 text-[#C7FF3C]" />{economyMode ? "Economia ativa" : "Economizar dados"}</button>
            <button type="button" onClick={() => setLocation(appUrl("/planejar"))} className="min-h-11 rounded-xl bg-[#C7FF3C] text-xs font-extrabold text-[#0B1014] shadow-[0_8px_20px_rgba(199,255,60,.12)] transition active:scale-[.98]"><Navigation className="mr-2 inline size-4" />Planejar</button>
          </div>
        </div>
      </div>
    </section>
  );
}
