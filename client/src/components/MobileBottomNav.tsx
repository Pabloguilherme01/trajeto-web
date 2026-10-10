import { Bookmark, Database, Fuel, Home, Navigation, UserRound, HelpCircle, Search, X, MapPinned, HeartPulse, Landmark, Siren, ShoppingBag, Utensils, ShoppingCart, BriefcaseBusiness, BookOpen, UsersRound, Store, Wrench } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { preparePrimaryRoute } from "@/lib/primaryRoutes";
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
          return <button key={item.key} ref={item.key === "more" ? moreButton : undefined} type="button" onPointerDown={() => { if (item.key !== "more") preparePrimaryRoute(item.href); }} onPointerEnter={() => { if (item.key !== "more") preparePrimaryRoute(item.href); }} onFocus={() => { if (item.key !== "more") preparePrimaryRoute(item.href); }} onClick={() => go(item)}
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
      <DialogContent showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); moreButton.current?.focus(); }} className="premium-card max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain rounded-2xl border-border bg-card pb-[max(1rem,env(safe-area-inset-bottom))] text-card-foreground">
        <DialogClose aria-label="Fechar menu" className="absolute right-2 top-2 grid size-11 place-items-center rounded-xl text-muted-foreground"><X className="size-5 shrink-0" /></DialogClose>
        <DialogTitle className="pr-10">Explorar o Trajeto</DialogTitle>
        <DialogDescription>Encontre lugares, abra o mapa ou acesse seus recursos salvos.</DialogDescription>
        {[
          { title: "Lugares e comércio", items: [
            { label: "Buscar no Trajeto", icon: Search, path: "/buscar" },
            { label: "Abrir mapa", icon: MapPinned, path: "/mapa" },
            { label: "Encontrar postos", icon: Fuel, path: "/postos" },
            { label: "Comer", icon: Utensils, path: "/buscar?q=alimentacao" },
            { label: "Compras e lojas", icon: ShoppingBag, path: "/buscar?q=compras" },
            { label: "Mercados", icon: ShoppingCart, path: "/buscar?q=mercados" },
            { label: "Farmácias", icon: Store, path: "/buscar?q=farmacias" },
            { label: "Oficinas", icon: Wrench, path: "/buscar?q=oficinas" },
          ] },
          { title: "Atendimento público", items: [
            { label: "Saúde", icon: HeartPulse, path: "/servicos?categoria=saude" },
            { label: "Emergência", icon: Siren, path: "/servicos?emergencia=1#emergency-strip-title" },
            { label: "Educação", icon: BookOpen, path: "/servicos?categoria=educacao" },
            { label: "Trabalho e renda", icon: BriefcaseBusiness, path: "/servicos?categoria=trabalho" },
            { label: "Assistência social", icon: UsersRound, path: "/servicos?categoria=assistencia" },
            { label: "Documentos", icon: Landmark, path: "/servicos?categoria=documentos" },
          ] },
          { title: "Seus recursos", items: [
            { label: "Dados da cidade", icon: Database, path: "/dados" },
            { label: "Salvos", icon: Bookmark, path: "/salvos" },
            { label: "Ajuda e offline", icon: HelpCircle, path: "/ajuda" },
          ] },
        ].map(group => <section key={group.title} aria-label={group.title}>
          <h3 className="mb-2 mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.title}</h3>
          <div className="mobile-explore-grid grid grid-cols-2 gap-2">
            {group.items.map(item => <button key={item.path} type="button" onPointerEnter={() => preparePrimaryRoute(item.path)} onPointerDown={() => preparePrimaryRoute(item.path)} onFocus={() => preparePrimaryRoute(item.path)} onClick={() => { setMoreOpen(false); preparePrimaryRoute(item.path); const split = item.path.search(/[?#]/); setLocation(split < 0 ? appUrl(item.path) : appUrl(item.path.slice(0, split)) + item.path.slice(split)); }} className="task-action task-action-secondary min-h-12 min-w-0 justify-start break-words rounded-xl px-3 text-left text-[13px] leading-tight"><item.icon className="size-4 shrink-0 text-primary" />{item.label}</button>)}
          </div>
        </section>)}
        <button type="button" onClick={() => { setMoreOpen(false); window.requestAnimationFrame(() => window.dispatchEvent(new Event(OPEN_ACCESSIBILITY_EVENT))); }} className="task-action task-action-secondary min-h-12 min-w-0 justify-start break-words rounded-xl px-3 text-left text-[13px] leading-tight" aria-label="Abrir acessibilidade"><UserRound className="size-4 shrink-0" /> Acessibilidade e aparelho</button>
        {!isGitHubPagesRuntime() && <button type="button" onClick={() => { setMoreOpen(false); setLocation(appUrl("/minha-conta")); }} className="task-action task-action-secondary min-h-16 min-w-0 justify-start break-words rounded-xl px-3 text-left text-[13px] leading-tight"><UserRound className="size-5 shrink-0" /> Minha conta</button>}
      </DialogContent>
    </Dialog>
  </>;
}
