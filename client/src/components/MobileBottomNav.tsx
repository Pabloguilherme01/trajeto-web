import { Bookmark, Database, Fuel, Home, Navigation, UserRound, HelpCircle, Search, X, MapPinned, HeartPulse, Landmark, Siren, ShoppingBag, Utensils } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { appUrl } from "@/lib/appUrl";
import { OPEN_ACCESSIBILITY_EVENT } from "@/components/DailyCommandCenter";

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
      <div className={variant === "mobile" ? "app-dock mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.35rem] p-1.5" : "container grid max-w-3xl grid-cols-4 gap-2"}>
        {baseItems.map(item => {
          const active = isActive(item);
          const primary = item.key === "plan"; const Icon = item.icon;
          return <button key={item.key} ref={item.key === "more" ? moreButton : undefined} type="button" onClick={() => go(item)}
            aria-label={item.label} aria-current={active && item.key !== "more" ? "page" : undefined} aria-haspopup={item.key === "more" ? "dialog" : undefined} aria-expanded={item.key === "more" ? moreOpen : undefined}
            data-active={active ? "true" : "false"} data-primary={primary ? "true" : "false"}
            className="app-dock-item relative flex min-h-[3.45rem] flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1 active:scale-[.97]">
            <Icon className="size-[1.05rem]" strokeWidth={primary || active ? 2.7 : 2} /><span className="text-xs font-extrabold">{item.short}</span>
            {active && !primary && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-primary" aria-hidden="true" />}
          </button>;
        })}
      </div>
    </nav>
    <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); moreButton.current?.focus(); }} className="premium-card max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border-border bg-card text-card-foreground">
        <DialogClose aria-label="Fechar menu" className="absolute right-2 top-2 grid size-11 place-items-center rounded-xl text-muted-foreground"><X className="size-5 shrink-0" /></DialogClose>
        <DialogTitle className="pr-10">Explorar o Trajeto</DialogTitle>
        <DialogDescription>Encontre lugares, abra o mapa ou acesse seus recursos salvos.</DialogDescription>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar")); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><Search className="size-5 shrink-0" /> Buscar no Trajeto</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/mapa")); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><MapPinned className="size-5 shrink-0" /> Mapa e locais</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/servicos") + "?categoria=saude"); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><HeartPulse className="size-5 shrink-0" /> Saúde</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/servicos") + "?emergencia=1#emergency-strip-title"); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><Siren className="size-5 shrink-0" /> Emergência</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/postos")); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><Fuel className="size-5 shrink-0" /> Encontrar postos</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=alimentacao"); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><Utensils className="size-5 text-warning" /> Comer</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/buscar") + "?q=compras"); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><ShoppingBag className="size-5 text-accent" /> Compras e lojas</button>

          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/dados")); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><Database className="size-5 shrink-0" /> Dados da cidade</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/salvos")); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><Bookmark className="size-5 shrink-0" /> Salvos</button>
          <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/ajuda")); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><HelpCircle className="size-5 shrink-0" /> Ajuda e offline</button>
          <button type="button" onClick={() => { setMoreOpen(false); window.requestAnimationFrame(() => window.dispatchEvent(new Event(OPEN_ACCESSIBILITY_EVENT))); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left" aria-label="Abrir acessibilidade"><UserRound className="size-5 shrink-0" /> Acessibilidade e aparelho</button>
        </div>
        {!isGitHubPagesRuntime() && <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/minha-conta")); }} className="task-action task-action-secondary min-h-14 justify-start break-words rounded-xl px-4 text-left"><UserRound className="size-5 shrink-0" /> Minha conta</button>}
      </DialogContent>
    </Dialog>
  </>;
}
