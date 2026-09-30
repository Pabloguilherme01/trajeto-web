import { Bookmark, Fuel, Home, Navigation, UserRound, MoreHorizontal, HelpCircle, Search, X, MapPinned, HeartPulse, Landmark, Siren } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, mobilePreferenceEvent } from "@/lib/mobilePreferences";

const baseItems = [
  { key: "home", href: "/", label: "Início", short: "Início", icon: Home },
  { key: "map", href: "/mapa", label: "Mapa", short: "Mapa", icon: MapPinned },
  { key: "plan", href: "/planejar", label: "Rotas", short: "Rotas", icon: Navigation },
  { key: "more", href: "/ajuda", label: "Mais opções", short: "Mais", icon: MoreHorizontal },
] as const;

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  const [lastTrip, setLastTrip] = useState(getLastTrip);

  useEffect(() => {
    const refresh = () => {
      setLastTrip(getLastTrip());
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
    };
  }, []);

  const current = location.split("?")[0].replace(/\/$/, "") || "/";

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
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.35rem] border border-white/10 bg-[#090E12]/95 p-1.5 shadow-[0_-10px_40px_rgba(0,0,0,.42)] backdrop-blur-2xl">
        {baseItems.map(item => {
          const active = current === item.href || (item.href !== "/" && current.startsWith(item.href + "/"));
          const primary = item.key === "plan";
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              ref={item.key === "more" ? moreButton : undefined}
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
              <span className="text-[0.55rem] font-extrabold">{item.short}</span>
              {active && !primary && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[#C7FF3C]" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
    <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); moreButton.current?.focus(); }} className="border-white/10 bg-[#121B22] text-white">
        <DialogClose aria-label="Fechar menu" className="absolute right-2 top-2 grid size-11 place-items-center rounded-xl text-white/70"><X className="size-5" /></DialogClose>
        <DialogTitle>Mais opções</DialogTitle>
        <DialogDescription>Postos, salvos, ajuda e conta ficam aqui.</DialogDescription>
        <div className="grid gap-2">
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
            <Search className="size-5" /> Buscar no Trajeto
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent("Centro Águas Lindas")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
            <MapPinned className="size-5" /> Explorar o Centro
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent("saúde Águas Lindas")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
            <HeartPulse className="size-5" /> Saúde
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent("serviço público Águas Lindas")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
            <Landmark className="size-5" /> Serviços públicos
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent("emergência Águas Lindas")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
            <Siren className="size-5" /> Emergência
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/postos")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
            <Fuel className="size-5" /> Encontrar postos
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/salvos")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
            <Bookmark className="size-5" /> Salvos
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/explorar")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
            <MapPinned className="size-5" /> Explorer
          </button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/ajuda")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
            <HelpCircle className="size-5" /> Ajuda e uso offline
          </button>
        </div>
        {!isGitHubPagesRuntime() && <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/minha-conta")); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-left font-bold">
          <UserRound className="size-5" /> Minha conta
        </button>}
      </DialogContent>
    </Dialog>
    </>
  );
}
