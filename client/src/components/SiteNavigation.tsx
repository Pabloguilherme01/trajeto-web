import { Bookmark, HelpCircle, Home, MapPinned, Navigation, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/planejar", label: "Planejar", icon: Navigation, primary: true },
  { href: "/salvos", label: "Salvos", icon: Bookmark },
  { href: "/postos", label: "Postos", icon: MapPinned },
  { href: "/minha-conta", label: "Minha conta", icon: UserRound },
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle },
] as const;

export default function SiteNavigation() {
  const [location] = useLocation();
  const current = location.split("?")[0].replace(/\/$/, "") || "/";

  return (
    <nav aria-label="Navegação principal" className="hidden border-b border-white/8 bg-[#0B1014]/90 shadow-[0_10px_35px_rgba(0,0,0,.12)] backdrop-blur-xl md:block">
      <div className="container">
        <ul className="flex min-h-12 items-center gap-1 overflow-x-auto">
          {items.map(({ href, label, icon: Icon, primary }) => {
            const active = current === href || (href !== "/" && current.startsWith(href + "/"));
            return (
              <li key={href} className="shrink-0">
              <Link
                
                href={appUrl(href)}
                aria-current={active ? "page" : undefined}
                className={
                  primary
                    ? "group relative ml-1 inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl bg-[#C7FF3C] px-3.5 text-[0.68rem] font-extrabold text-[#0B1014] shadow-[0_5px_18px_rgba(199,255,60,.12)] transition hover:bg-white"
                    : active
                      ? "group relative inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl bg-white/[0.09] px-3 text-[0.68rem] font-extrabold text-white ring-1 ring-white/10"
                      : "group relative inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-[0.68rem] font-bold text-[#91A3AC] transition hover:bg-white/[0.06] hover:text-white"
                }
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
                {active && !primary && <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-[#C7FF3C]" aria-hidden="true" />}
              </Link>
              </li>
            );
          })}
          <li className="ml-auto flex shrink-0 items-center gap-2 pl-3 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#60737D]">
            <span className="size-1.5 rounded-full bg-[#C7FF3C]" aria-hidden="true" />
            Fluxo público · sem cadastro
          </li>
        </ul>
      </div>
    </nav>
  );
}
