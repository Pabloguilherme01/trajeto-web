import { Bookmark, Fuel, Home, Navigation, UserRound, MoreHorizontal, HelpCircle, Search, X, MapPinned, HeartPulse, Landmark, Siren, ShoppingBag, Utensils } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { appUrl } from "@/lib/appUrl";

const baseItems = [
  { key: "home", href: "/", label: "Início", short: "Início", icon: Home },
  { key: "services", href: "/servicos", label: "Serviços públicos", short: "Serviços", icon: Landmark },
  { key: "plan", href: "/planejar", label: "Rotas", short: "Rotas", icon: Navigation },
  { key: "more", href: "/ajuda", label: "Mais opções", short: "Mais", icon: MoreHorizontal },
] as const;

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);

  const current = location.split("?")[0].replace(/\/$/, "") || "/";
  const matchesPath = (path: string) =>
    current === path || current.startsWith(path + "/");
  const isActive = (item: (typeof baseItems)[number]) => {
    if (item.key === "plan")
      return ["/planejar", "/rota", "/salvos"].some(matchesPath);
    if (item.key === "more")
      return (
        moreOpen ||
        ["/mapa", "/buscar", "/postos", "/local", "/explorar", "/ajuda"].some(
          matchesPath
        )
      );
    return matchesPath(item.href);
  };
  const go = (item: (typeof baseItems)[number]) => {
    if (item.key === "more") {
      setMoreOpen(true);
      return;
    }
    setLocation(appUrl(item.href));
  };

  return <>
    <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.35rem] border border-white/10 bg-[#090E12]/95 p-1.5 shadow-[0_-10px_40px_rgba(0,0,0,.42)] backdrop-blur-2xl">
        {baseItems.map(item => {
          const active = isActive(item);
          const primary = item.key === "plan"; const Icon = item.icon;
          return <button key={item.key} ref={item.key === "more" ? moreButton : undefined} type="button" onClick={() => go(item)} aria-current={active ? "page" : undefined}
            aria-label={item.label} aria-haspopup={item.key === "more" ? "dialog" : undefined} aria-expanded={item.key === "more" ? moreOpen : undefined}
            className={primary ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-[#C7FF3C] px-1 text-[#0B1014] active:scale-[.97]"
              : active ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-white/[.08] px-1 text-white"
              : "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1 text-[#8798A1] active:scale-[.97]"}>
            <Icon className="size-[1.05rem]" strokeWidth={primary || active ? 2.7 : 2} /><span className="text-xs font-extrabold">{item.short}</span>
            {active && !primary && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[#C7FF3C]" aria-hidden="true" />}
          </button>;
        })}
      </div>
    </nav>
    <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); moreButton.current?.focus(); }} className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border-white/10 bg-[#121B22] text-white">
        <DialogClose aria-label="Fechar menu" className="absolute right-2 top-2 grid size-11 place-items-center rounded-xl text-white/70"><X className="size-5 shrink-0" /></DialogClose>
        <DialogTitle className="pr-10">Mais opções</DialogTitle>
        <DialogDescription>Busca, mapa, saúde, emergência, postos e recursos locais ficam aqui.</DialogDescription>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar")); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Search className="size-5 shrink-0" /> Buscar no Trajeto</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/mapa")); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><MapPinned className="size-5 shrink-0" /> Mapa e locais</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/servicos") + "?categoria=saude"); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><HeartPulse className="size-5 shrink-0" /> Saúde</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/servicos") + "?emergencia=1#emergency-strip-title"); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Siren className="size-5 shrink-0" /> Emergência</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/postos")); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Fuel className="size-5 shrink-0" /> Encontrar postos</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=alimentacao"); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Utensils className="size-5 text-[#FFB86B]" /> Comer</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=compras"); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><ShoppingBag className="size-5 text-[#3DE3FF]" /> Compras e lojas</button>

          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/salvos")); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Bookmark className="size-5 shrink-0" /> Salvos</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/ajuda")); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><HelpCircle className="size-5 shrink-0" /> Ajuda e offline</button>
        </div>
        {!isGitHubPagesRuntime() && <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/minha-conta")); }} className="flex min-h-14 items-center gap-2 text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><UserRound className="size-5 shrink-0" /> Minha conta</button>}
      </DialogContent>
    </Dialog>
  </>;
}
