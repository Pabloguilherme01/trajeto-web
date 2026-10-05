import { Bookmark, Database, Fuel, Home, Navigation, UserRound, HelpCircle, Search, X, MapPinned, HeartPulse, Landmark, Siren, ShoppingBag, Utensils } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { appUrl } from "@/lib/appUrl";

const baseItems = [
  { key: "home", href: "/", label: "Início", short: "Início", icon: Home },
  { key: "more", href: "/mapa", label: "Explorar", short: "Explorar", icon: MapPinned },
  { key: "plan", href: "/planejar", label: "Rotas", short: "Rotas", icon: Navigation },
  { key: "services", href: "/servicos", label: "Serviços públicos", short: "Serviços", icon: Landmark },
] as const;

export default function MobileBottomNav({ variant = "mobile" }: { variant?: "mobile" | "desktop" }) {
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
        ["/mapa", "/buscar", "/postos", "/local", "/explorar", "/dados", "/ajuda"].some(
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
    <nav aria-label={variant === "mobile" ? "Navegação móvel" : "Navegação principal"} className={variant === "mobile" ? "fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] md:hidden" : "hidden border-b border-border bg-background/95 py-2 backdrop-blur-xl md:block"}>
      <div className={variant === "mobile" ? "mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.35rem] border border-border bg-background/95 p-1.5 shadow-[0_-10px_40px_rgba(0,0,0,.42)] backdrop-blur-2xl" : "container grid max-w-3xl grid-cols-4 gap-2"}>
        {baseItems.map(item => {
          const active = isActive(item);
          const primary = item.key === "plan"; const Icon = item.icon;
          return <button key={item.key} ref={item.key === "more" ? moreButton : undefined} type="button" onClick={() => go(item)} aria-current={active ? "page" : undefined}
            aria-label={item.label} aria-haspopup={item.key === "more" ? "dialog" : undefined} aria-expanded={item.key === "more" ? moreOpen : undefined}
            className={primary ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-primary px-1 text-background active:scale-[.97]"
              : active ? "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-white/[.08] px-1 text-white"
              : "relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1 text-muted-foreground active:scale-[.97]"}>
            <Icon className="size-[1.05rem]" strokeWidth={primary || active ? 2.7 : 2} /><span className="text-xs font-extrabold">{item.short}</span>
            {active && !primary && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-primary" aria-hidden="true" />}
          </button>;
        })}
      </div>
    </nav>
    <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); moreButton.current?.focus(); }} className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border-white/10 bg-card text-white">
        <DialogClose aria-label="Fechar menu" className="absolute right-2 top-2 grid size-11 place-items-center rounded-xl text-white/70"><X className="size-5 shrink-0" /></DialogClose>
        <DialogTitle className="pr-10">Explorar o Trajeto</DialogTitle>
        <DialogDescription>Encontre lugares, abra o mapa ou acesse seus recursos salvos.</DialogDescription>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar")); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Search className="size-5 shrink-0" /> Buscar no Trajeto</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/mapa")); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><MapPinned className="size-5 shrink-0" /> Mapa e locais</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/servicos") + "?categoria=saude"); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><HeartPulse className="size-5 shrink-0" /> Saúde</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/servicos") + "?emergencia=1#emergency-strip-title"); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Siren className="size-5 shrink-0" /> Emergência</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/postos")); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Fuel className="size-5 shrink-0" /> Encontrar postos</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=alimentacao"); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Utensils className="size-5 text-warning" /> Comer</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=compras"); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><ShoppingBag className="size-5 text-accent" /> Compras e lojas</button>

          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/dados")); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Database className="size-5 shrink-0" /> Dados da cidade</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/salvos")); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><Bookmark className="size-5 shrink-0" /> Salvos</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/ajuda")); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><HelpCircle className="size-5 shrink-0" /> Ajuda e offline</button>
        </div>
        {!isGitHubPagesRuntime() && <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/minha-conta")); }} className="flex min-h-14 min-w-0 items-center gap-2 break-words text-sm rounded-xl border border-white/10 px-4 text-left font-bold"><UserRound className="size-5 shrink-0" /> Minha conta</button>}
      </DialogContent>
    </Dialog>
  </>;
}
