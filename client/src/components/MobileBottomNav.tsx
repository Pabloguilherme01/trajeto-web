import { Bookmark, Home, Map, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import MobileMoreSheet from "@/components/MobileMoreSheet";
import { mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { mobileStationStoreEvent } from "@/lib/mobileStationStore";
import { listMobileStationFavorites } from "@/lib/mobileStationStore";

const baseItems = [
  { key: "home", href: "/", label: "Início", short: "Início", icon: Home },
  { key: "map", href: "/mapa", label: "Mapa", short: "Mapa", icon: Map },
  { key: "saved", href: "/salvos", label: "Salvos", short: "Salvos", icon: Bookmark },
  { key: "more", href: "#", label: "Mais", short: "Mais", icon: MoreHorizontal },
] as const;

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const [savedTotal, setSavedTotal] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        setSavedTotal(listMobileStationFavorites().length);
      } catch {
        setSavedTotal(0);
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(mobileStationStoreEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(mobileStationStoreEvent, refresh);
    };
  }, []);

  const current = location.split("?")[0].replace(/\/$/, "") || "/";
  const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
  const savedMode = searchParams.get("salvos") === "1";
  const mapMode = current === "/mapa" || (current === "/postos" && searchParams.get("view") === "map");

  const go = (item: typeof baseItems[number]) => {
    if (item.key === "more") {
      setMoreOpen(true);
      return;
    }
    if (item.key === "map") {
      setLocation(appUrl("/mapa"));
      return;
    }
    setLocation(appUrl(item.href));
  };

  return (
    <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-[60] px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.35rem] border border-white/10 bg-[#090E12]/95 p-1.5 shadow-[0_-10px_40px_rgba(0,0,0,.42)] backdrop-blur-2xl">
        {baseItems.map(item => {
          const active = item.key === "saved"
            ? (current === "/salvos" || (current === "/planejar" && savedMode))
            : item.key === "map"
              ? mapMode
              : current === item.href || (item.href !== "/" && current.startsWith(item.href + "/"));
          const primary = item.key === "map";
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => go(item)}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={primary
                ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-[#C7FF3C] px-1 text-[#0B1014] active:scale-[.97]"
                : active
                  ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-white/[.08] px-1 text-white"
                  : "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1 text-[#8798A1] active:scale-[.97]"}
            >
              <Icon className="size-[1.05rem]" strokeWidth={primary || active ? 2.7 : 2} />
              <span className="text-[0.55rem] font-extrabold">{item.short}</span>
              {item.key === "saved" && savedTotal > 0 && <span className="absolute right-2 top-1.5 grid min-w-4 place-items-center rounded-full bg-[#3DE3FF] px-1 text-[0.45rem] font-black text-[#0B1014]">{savedTotal > 9 ? "9+" : savedTotal}</span>}
              {active && !primary && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[#C7FF3C]" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </nav>
  );
}
