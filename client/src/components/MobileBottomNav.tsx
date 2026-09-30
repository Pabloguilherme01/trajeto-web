import { Bookmark, Fuel, Home, Navigation, UserRound, MoreHorizontal, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";
import { listOfflineRoutes, offlineRouteEvent } from "@/lib/offlineStore";

const baseItems = [
  { key: "home", href: "/", label: "Início", short: "Início", icon: Home },
  { key: "plan", href: "/planejar", label: "Planejar", short: "Planejar", icon: Navigation },
  { key: "stations", href: "/postos", label: "Postos", short: "Postos", icon: Fuel },
  { key: "saved", href: "/salvos", label: "Salvos", short: "Salvos", icon: Bookmark },
  { key: "more", href: "/ajuda", label: "Mais opções", short: "Mais", icon: MoreHorizontal },
] as const;

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [moreOpen, setMoreOpen] = useState(false);
  const [lastTrip, setLastTrip] = useState(getLastTrip);
  const [savedRoutes, setSavedRoutes] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setLastTrip(getLastTrip());
      void listOfflineRoutes().then(routes => setSavedRoutes(routes.length)).catch(() => setSavedRoutes(0));
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
    };
  }, []);

  const current = location.split("?")[0].replace(/\/$/, "") || "/";
  const savedMode = new URLSearchParams(search).get("salvos") === "1";
  const resumeLabel = lastTrip ? "Continuar" : "Planejar";

  const go = (item: typeof baseItems[number]) => {
    if (item.key === "more") { setMoreOpen(true); return; }
    if (item.key === "plan" && lastTrip) {
      setLocation(
        appUrl("/planejar") +
        "?origem=" + encodeURIComponent(lastTrip.origin) +
        "&destino=" + encodeURIComponent(lastTrip.destination),
      );
      return;
    }
    setLocation(appUrl(item.href));
  };

  return (
    <>
    <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.35rem] border border-white/10 bg-[#090E12]/95 p-1.5 shadow-[0_-10px_40px_rgba(0,0,0,.42)] backdrop-blur-2xl">
        {baseItems.map(item => {
          const active = item.key === "saved"
            ? (current === "/salvos" || (current === "/planejar" && savedMode))
            : (item.key !== "plan" || !savedMode) && (current === item.href || (item.href !== "/" && current.startsWith(item.href + "/")));
          const primary = item.key === "plan";
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => go(item)}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              aria-haspopup={item.key === "more" ? "dialog" : undefined}
              aria-expanded={item.key === "more" ? moreOpen : undefined}
              className={primary
                ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-[#C7FF3C] px-1 text-[#0B1014] active:scale-[.97]"
                : active
                  ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-white/[.08] px-1 text-white"
                  : "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1 text-[#8798A1] active:scale-[.97]"}
            >
              <Icon className="size-[1.05rem]" strokeWidth={primary || active ? 2.7 : 2} />
              <span className="text-[0.55rem] font-extrabold">{primary && lastTrip ? resumeLabel : item.short}</span>
              {item.key === "saved" && savedRoutes > 0 && <span className="absolute right-2 top-1.5 grid min-w-4 place-items-center rounded-full bg-[#3DE3FF] px-1 text-[0.45rem] font-black text-[#0B1014]">{savedRoutes > 9 ? "9+" : savedRoutes}</span>}
              {active && !primary && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[#C7FF3C]" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
    <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
      <DialogContent className="border-white/10 bg-[#121B22] text-white">
        <DialogTitle>Mais opções</DialogTitle>
        <DialogDescription>Ajuda e recursos do Trajeto.</DialogDescription>
        <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/ajuda")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
          <HelpCircle className="size-5" /> Ajuda e uso offline
        </button>
        {!isGitHubPagesRuntime() && <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/minha-conta")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
          <UserRound className="size-5" /> Minha conta
        </button>}
      </DialogContent>
    </Dialog>
    </>
  );
}
