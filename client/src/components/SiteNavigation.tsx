import { Bookmark, HelpCircle, Home, MapPinned, Navigation, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/planejar", label: "Planejar", icon: Navigation, primary: true },\n  { href: "/salvos", label: "Salvos", icon: Bookmark },
  { href: "/postos", label: "Postos", icon: MapPinned },
  { href: "/minha-conta", label: "Minha conta", icon: UserRound },
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle },
] as const;

export default function SiteNavigation() {
  const [location] = useLocation();
  const current = location.split("?")[0].replace(/\/$/, "") || "/";

  return (
    <nav aria-label="Navegação principal" className="hidden border-b border-white/8 bg-[#0B1014]/95 backdrop-blur-xl md:block">
      <div className="container">
        <div className="flex min-h-12 items-center gap-1 overflow-x-auto">
          {items.map(({ href, label, icon: Icon, primary }) => {
            const active = current === href || (href !== "/" && current.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={appUrl(href)}
                aria-current={active ? "page" : undefined}
                className={
                  primary
                    ? "ml-1 inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg bg-[#C7FF3C] px-3.5 text-[0.68rem] font-extrabold text-[#0B1014] transition hover:bg-white"
                    : active
                      ? "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg bg-white/[0.09] px-3 text-[0.68rem] font-extrabold text-white ring-1 ring-white/10"
                      : "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[0.68rem] font-bold text-[#91A3AC] transition hover:bg-white/[0.06] hover:text-white"
                }
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-3 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#60737D]">
            <span className="size-1.5 rounded-full bg-[#C7FF3C]" aria-hidden="true" />
            Fluxo público · sem cadastro
          </div>
        </div>
      </div>
    </nav>
  );
}
