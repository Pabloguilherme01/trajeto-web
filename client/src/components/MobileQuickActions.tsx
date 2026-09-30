import { Bookmark, Fuel, Navigation, Share2, LocateFixed, WifiOff, Sparkles, Gauge } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { shareText, vibration } from "@/lib/mobileTools";
import { getLastIntent, getLastTrip, mobilePreferenceEvent, rememberIntent } from "@/lib/mobilePreferences";
import { getAutomaticDailyMode, getSavedDailyMode, type DailyModeId } from "@/lib/dailyModes";
import { listOfflineRoutes, offlineRouteEvent } from "@/lib/offlineStore";
import { getFavoriteDestination, getDestinationUsage, getMobileDestinations, mobileDestinationEvent, rememberDestinationUsage, type MobileDestination } from "@/lib/mobileDestinations";
import { chooseMobilePrimaryAction } from "@/lib/mobilePrimaryAction";

export default function MobileQuickActions() {
  const [location, setLocation] = useLocation();
  const current = location.split("?")[0].replace(/\/$/, "") || "/";
  const savedMode = new URLSearchParams(location.split("?")[1] ?? "").get("salvos") === "1";
  const [locating, setLocating] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "done">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [lastTrip, setLastTrip] = useState<{ origin: string; destination: string } | null>(() => getLastTrip());
  const [lastIntent, setLastIntent] = useState(getLastIntent);
  const [shareLabel, setShareLabel] = useState("Compartilhar");
  const [dismissedStatus, setDismissedStatus] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [favoriteDestination, setFavoriteDestination] = useState<MobileDestination | null>(() => getFavoriteDestination());
  const [savedRoutesCount, setSavedRoutesCount] = useState(0);
  const [dailyMode, setDailyMode] = useState<DailyModeId>(() => getSavedDailyMode() ?? "automatico");

  useEffect(() => {
    const onOnline = () => { setOnline(true); vibration(8); };
    const onOffline = () => { setOnline(false); vibration([8, 30, 8]); };
    const refresh = () => {
      setLastTrip(getLastTrip());
      setLastIntent(getLastIntent());
      setFavoriteDestination(getFavoriteDestination(getMobileDestinations(), getDestinationUsage()));
      setDailyMode(getSavedDailyMode() ?? "automatico");
      void listOfflineRoutes().then(routes => setSavedRoutesCount(routes.length)).catch(() => setSavedRoutesCount(0));
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(mobileDestinationEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(mobileDestinationEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateKeyboard = () => {
      if (!viewport) return setKeyboardOpen(false);
      const obscuredHeight = window.innerHeight - viewport.height;
      setKeyboardOpen(obscuredHeight > 140);
    };
    updateKeyboard();
    viewport?.addEventListener("resize", updateKeyboard);
    viewport?.addEventListener("scroll", updateKeyboard);
    return () => {
      viewport?.removeEventListener("resize", updateKeyboard);
      viewport?.removeEventListener("scroll", updateKeyboard);
    };
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    setDismissedStatus(false);
    const timer = window.setTimeout(() => setDismissedStatus(true), 4000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const locate = () => {
    if (!online) {
      setStatusMessage(savedRoutesCount > 0
        ? "Sem internet. Continue uma rota salva ou tente novamente quando voltar."
        : "Sem internet. A busca por perto precisa de conexão.");
      return;
    }
    if (!navigator.geolocation || locating) return;
    vibration();
    setLocating(true);
    rememberIntent("nearby");
    navigator.geolocation.getCurrentPosition(position => {
      setLocating(false);
      vibration(18);
      setStatusMessage("Localização encontrada. Abrindo postos próximos.");
      setLocation(appUrl("/postos") + "?lat=" + position.coords.latitude + "&lng=" + position.coords.longitude + "&q=" + encodeURIComponent("postos próximos"));
    }, () => {
      setLocating(false);
      setStatusMessage("Não foi possível obter sua localização. Verifique a permissão do navegador.");
      vibration([8, 25, 8]);
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 });
  };

  const resumeAction = () => {
    vibration();
    if (lastIntent === "route" && lastTrip) {
      setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination));
      return;
    }
    if (lastIntent === "saved") {
      setLocation(appUrl("/planejar") + "?salvos=1");
      return;
    }
    if (lastIntent === "nearby") {
      locate();
      return;
    }
    setLocation(appUrl("/postos"));
  };

  const resumeLabel = lastIntent === "route" && lastTrip
    ? "Retomar"
    : lastIntent === "saved"
      ? "Salvos"
      : lastIntent === "nearby"
        ? "Perto"
        : "Postos";

  const shareMessage = lastTrip
    ? `Minha próxima viagem no Trajeto: ${lastTrip.origin} → ${lastTrip.destination}.`
    : "Use o Trajeto para planejar viagens, encontrar postos e guardar rotas offline.";
  const shareUrl = lastTrip
    ? `${window.location.origin}${appUrl("/planejar")}?origem=${encodeURIComponent(lastTrip.origin)}&destino=${encodeURIComponent(lastTrip.destination)}`
    : `${window.location.origin}${appUrl("/")}`;


  const automaticMode = getAutomaticDailyMode(online, savedRoutesCount);
  const primary = chooseMobilePrimaryAction({
    online,
    mode: dailyMode,
    automaticMode,
    savedRoutes: savedRoutesCount,
    favorite: favoriteDestination,
    lastTrip,
  });
  const runPrimary = () => {
    vibration();
    if (primary.kind === "offline") {
      rememberIntent("saved");
      setLocation(appUrl("/planejar?salvos=1"));
      return;
    }
    if (primary.kind === "repeat" && primary.target?.origin && primary.target.destination) {
      rememberIntent("route");
      setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(primary.target.origin) + "&destino=" + encodeURIComponent(primary.target.destination));
      return;
    }
    if (primary.kind === "destination" && primary.target?.destination) {
      const updated = favoriteDestination ? rememberDestinationUsage(favoriteDestination) : getDestinationUsage();
      if (favoriteDestination) setFavoriteDestination(getFavoriteDestination(getMobileDestinations(), updated));
      rememberIntent("route");
      setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(primary.target.destination));
      return;
    }
    if (primary.kind === "economy") {
      setLocation(appUrl("/") + "#calculadora");
      return;
    }
    resumeAction();
  };
  const primaryShortLabel = primary.kind === "repeat" ? "Repetir" : primary.kind === "destination" ? "Destino" : primary.kind === "economy" ? "Economia" : primary.kind === "offline" ? "Offline" : "Planejar";

  const actions = [
    { label: primary.label, short: primaryShortLabel, icon: primary.kind === "economy" ? Gauge : primary.kind === "offline" ? Bookmark : Navigation, path: "", run: runPrimary, smart: true },
    { label: "Postos", short: "Paradas", icon: Fuel, path: "/postos", run: () => { vibration(); rememberIntent("stations"); setLocation(appUrl("/postos")); } },
    { label: "Perto de mim", short: locating ? "GPS…" : "GPS", icon: LocateFixed, path: "", run: locate },
    { label: "Salvos", short: "Salvos", icon: Bookmark, path: "/planejar", run: () => { vibration(); rememberIntent("saved"); setLocation(appUrl("/planejar") + "?salvos=1"); } },
    { label: "Compartilhar", short: shareState === "done" ? shareLabel : lastTrip ? "Viagem" : "Enviar", icon: Share2, path: "", run: () => {
      vibration();
      void shareText(shareMessage, shareUrl, "Trajeto").then(() => {
        setShareState("done");
        setShareLabel("Enviado");
        vibration(18);
        window.setTimeout(() => { setShareState("idle"); setShareLabel(lastTrip ? "Viagem" : "Enviar"); }, 1800);
      }).catch(() => {
        setStatusMessage("Não foi possível compartilhar agora.");
        vibration([8, 25, 8]);
      });
    } },
  ];

  // Postos has its own contextual dock. Keeping both would stack two fixed nav bars on mobile.
  if (keyboardOpen || current.endsWith("/postos")) return null;

  return (
    <nav aria-label="Ações rápidas do Trajeto" className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className={`mobile-glass mx-auto max-w-md rounded-[1.45rem] border p-1.5 shadow-[0_20px_55px_rgba(0,0,0,.48)] transition-colors ${online ? "border-white/12 bg-[#080D11]/95" : "border-[#FFB86B]/35 bg-[#17110B]/95"}`}>
        <div className="mb-1 flex items-center justify-between px-2 pt-0.5">
          <span className="flex items-center gap-1 text-[0.5rem] font-extrabold uppercase tracking-[0.14em] text-[#71828B]"><Sparkles className="size-2.5 text-[#C7FF3C]" /> {dailyMode === "automatico" ? "Ação automática" : "Modo " + primary.kind}</span>
          <span className={`inline-flex items-center gap-2 text-[0.5rem] font-bold ${online ? "text-[#B9D979]" : "text-[#FFD49C]"}`}><span className={`inline-flex items-center gap-1.5`}><span className={`size-1.5 rounded-full ${online ? "bg-[#C7FF3C] shadow-[0_0_8px_rgba(199,255,60,.75)]" : "bg-[#FFB86B]"}`} aria-hidden="true" />{online ? "online" : "offline"}</span>{savedRoutesCount > 0 && <span className="rounded-full border border-white/8 bg-white/[.04] px-1.5 py-0.5 text-[0.45rem] text-white/55">{savedRoutesCount} offline</span>}</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {actions.map(({ label, short, icon: Icon, path, run, smart }) => {
            const active = label === "Salvos" ? current.endsWith("/planejar") && savedMode : label === "Postos" ? current.endsWith("/postos") && !savedMode : Boolean(path && current.endsWith(path));
            return (
              <button key={label} type="button" onClick={run} aria-label={label} title={label} aria-current={active ? "page" : undefined} className={smart ? "relative flex min-h-[3.7rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-[#C7FF3C] px-1 text-[#0B1014] shadow-[0_5px_16px_rgba(199,255,60,.16)] active:scale-[.97]" : active ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-[#C7FF3C] px-1 text-[#0B1014]" : "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1 text-[#9EADB4] transition active:scale-[.97] active:bg-white/10"}>
                <Icon className="size-[1.05rem]" strokeWidth={smart || active ? 2.6 : 2} />
                <span className="text-[0.58rem] font-extrabold tracking-[0.01em]">{smart ? label : active ? label : short}</span>
                {smart && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#0B1014]" aria-label="Atalho inteligente" />}
                {active && !smart && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[#0B1014]" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {!online && <p role="status" className="flex items-center justify-center gap-1 px-2 pb-1 pt-1 text-center text-[0.55rem] font-bold text-[#FFD49C]"><WifiOff className="size-3" /> Offline · ações salvas continuam disponíveis</p>}
        {statusMessage && !dismissedStatus && <p role="status" aria-live="polite" className="px-2 pb-1 pt-1 text-center text-[0.55rem] font-bold text-white/70">{statusMessage}</p>}
      </div>
    </nav>
  );
}
