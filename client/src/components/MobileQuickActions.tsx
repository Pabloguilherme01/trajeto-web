import { Bookmark, Fuel, Navigation, Share2, LocateFixed, WifiOff } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { shareText, vibration } from "@/lib/mobileTools";
import { getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";

export default function MobileQuickActions() {
  const [location, setLocation] = useLocation();
  const current = location.split("?")[0];
  const savedMode = new URLSearchParams(location.split("?")[1] ?? "").get("salvos") === "1";
  const [locating, setLocating] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "done">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [lastTrip, setLastTrip] = useState<{ origin: string; destination: string } | null>(() => getLastTrip());

  useEffect(() => {
    const onOnline = () => { setOnline(true); vibration(8); };
    const onOffline = () => { setOnline(false); vibration([8, 30, 8]); };
    const refreshTrip = () => setLastTrip(getLastTrip());
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", refreshTrip);
    window.addEventListener(mobilePreferenceEvent, refreshTrip);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", refreshTrip);
      window.removeEventListener(mobilePreferenceEvent, refreshTrip);
    };
  }, []);

  const locate = () => {
    if (!navigator.geolocation || locating) return;
    vibration();
    setLocating(true);
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

  const shareMessage = lastTrip
    ? `Minha próxima viagem no Trajeto: ${lastTrip.origin} → ${lastTrip.destination}.`
    : "Use o Trajeto para planejar viagens, encontrar postos e guardar rotas offline.";

  const actions = [
    { label: lastTrip ? "Retomar" : "Planejar", short: "Rota", icon: Navigation, path: "/planejar", run: () => {
      vibration();
      if (lastTrip) {
        setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination));
      } else {
        setLocation(appUrl("/planejar"));
      }
    } },
    { label: "Postos", short: "Paradas", icon: Fuel, path: "/postos", run: () => { vibration(); setLocation(appUrl("/postos")); } },
    { label: "Perto de mim", short: locating ? "GPS…" : "GPS", icon: LocateFixed, path: "", run: locate },
    { label: "Salvos", short: "Salvos", icon: Bookmark, path: "/postos", run: () => { vibration(); setLocation(appUrl("/postos") + "?salvos=1"); } },
    { label: "Compartilhar", short: shareState === "done" ? "Enviado" : lastTrip ? "Viagem" : "Enviar", icon: Share2, path: "", run: () => {
      vibration();
      void shareText(shareMessage, window.location.href, "Trajeto").then(() => {
        setShareState("done");
        vibration(18);
        window.setTimeout(() => setShareState("idle"), 1800);
      }).catch(() => {
        setStatusMessage("Não foi possível compartilhar agora.");
        vibration([8, 25, 8]);
      });
    } },
  ];

  return (
    <nav aria-label="Ações rápidas" className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className={`mx-auto max-w-md rounded-[1.4rem] border p-1.5 shadow-[0_20px_55px_rgba(0,0,0,.48)] backdrop-blur-2xl transition-colors ${online ? "border-white/12 bg-[#080D11]/95" : "border-[#FFB86B]/35 bg-[#17110B]/95"}`}>
        <div className="mb-1 flex items-center justify-between px-2 pt-0.5">
          <span className="text-[0.5rem] font-extrabold uppercase tracking-[0.14em] text-[#71828B]">Acesso rápido</span>
          <span className={`inline-flex items-center gap-1 text-[0.5rem] font-bold ${online ? "text-[#B9D979]" : "text-[#FFD49C]"}`}><span className={`size-1.5 rounded-full ${online ? "bg-[#C7FF3C] shadow-[0_0_8px_rgba(199,255,60,.75)]" : "bg-[#FFB86B]"}`} aria-hidden="true" />{online ? "online" : "offline"}</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {actions.map(({ label, short, icon: Icon, path, run }) => {
            const active = label === "Salvos" ? current === appUrl("/postos") && savedMode : label === "Postos" ? current === appUrl("/postos") && !savedMode : Boolean(path && current === appUrl(path));
            return (
              <button key={label} type="button" onClick={run} aria-current={active ? "page" : undefined}
                className={active
                  ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-[#C7FF3C] px-1 text-[#0B1014]"
                  : "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1 text-[#9EADB4] transition active:scale-[.97] active:bg-white/10"}>
                <Icon className="size-[1.05rem]" strokeWidth={active ? 2.6 : 2} />
                <span className="text-[0.58rem] font-extrabold tracking-[0.01em]">{active ? label : short}</span>
                {active && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[#0B1014]" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {!online && <p role="status" className="flex items-center justify-center gap-1 px-2 pb-1 pt-1 text-center text-[0.55rem] font-bold text-[#FFD49C]"><WifiOff className="size-3" /> Offline · ações salvas continuam disponíveis</p>}
        {statusMessage && <p role="status" aria-live="polite" className="px-2 pb-1 pt-1 text-center text-[0.55rem] font-bold text-white/70">{statusMessage}</p>}
      </div>
    </nav>
  );
}
