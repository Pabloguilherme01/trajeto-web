import { Download, Fuel, Navigation, Share2 } from "lucide-react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { shareText, vibration } from "@/lib/mobileTools";

export default function MobileQuickActions() {
  const [, setLocation] = useLocation();

  const actions = [
    { label: "Planejar", icon: Navigation, run: () => { vibration(); setLocation(appUrl("/planejar")); } },
    { label: "Postos", icon: Fuel, run: () => { vibration(); setLocation(appUrl("/postos")); } },
    { label: "Instalar", icon: Download, run: () => document.getElementById("instalar-app")?.scrollIntoView({ behavior: "smooth", block: "center" }) },
    { label: "Compartilhar", icon: Share2, run: () => { void shareText("Use o Trajeto para planejar viagens, encontrar postos e guardar rotas offline.", window.location.href, "Trajeto"); } },
  ];

  return (
    <nav aria-label="Ações rápidas" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-2xl border border-white/10 bg-[#0B1014]/95 p-1.5 shadow-2xl backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {actions.map(({ label, icon: Icon, run }) => (
          <button key={label} type="button" onClick={run} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[0.62rem] font-bold text-[#B7C4CA] active:bg-[#C7FF3C] active:text-[#0B1014]">
            <Icon className="size-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
