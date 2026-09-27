import { Bookmark, Fuel, Navigation, Share2, LocateFixed } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { appUrl } from "@/lib/appUrl";
import { shareText, vibration } from "@/lib/mobileTools";

export default function MobileQuickActions() {
  const [location, setLocation] = useLocation();
  const current = location.split("?")[0];
  const [locating, setLocating] = useState(false);
  const locate = () => {
    if (!navigator.geolocation || locating) return;
    vibration();
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      setLocating(false);
      setLocation(appUrl("/postos") + "?lat=" + position.coords.latitude + "&lng=" + position.coords.longitude + "&q=" + encodeURIComponent("postos próximos"));
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 });
  };
  const actions = [
    { label: "Planejar", short: "Rota", icon: Navigation, path: "/planejar", run: () => { vibration(); setLocation(appUrl("/planejar")); } },
    { label: "Postos", short: "Paradas", icon: Fuel, path: "/postos", run: () => { vibration(); setLocation(appUrl("/postos")); } },
    { label: "Perto de mim", short: locating ? "GPS…" : "GPS", icon: LocateFixed, path: "", run: locate },
    { label: "Salvos", short: "Salvos", icon: Bookmark, path: "/postos", run: () => { vibration(); setLocation(appUrl("/postos") + "?salvos=1"); } },
    { label: "Compartilhar", short: "Enviar", icon: Share2, path: "", run: () => { void shareText("Use o Trajeto para planejar viagens, encontrar postos e guardar rotas offline.", window.location.href, "Trajeto"); } },
  ];

  return (
    <nav aria-label="Ações rápidas" className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="mx-auto max-w-md rounded-[1.35rem] border border-white/12 bg-[#080D11]/95 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.45)] backdrop-blur-2xl">
        <div className="grid grid-cols-5 gap-1">
          {actions.map(({ label, short, icon: Icon, path, run }) => {
            const active = path && current === appUrl(path);
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
      </div>
    </nav>
  );
}
