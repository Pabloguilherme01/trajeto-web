import { Bookmark, Fuel, Home, Navigation, UserRound, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip } from "@/lib/mobilePreferences";
import { listOfflineRoutes } from "@/lib/offlineStore";

type Item = {
  href: string;
  label: string;
  icon: typeof Home;
  primary?: boolean;
};

const items: Item[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/postos", label: "Postos", icon: Fuel },
  { href: "/planejar", label: "Planejar", icon: Navigation, primary: true },
  { href: "/salvos", label: "Salvos", icon: Bookmark },
  { href: "/minha-conta", label: "Conta", icon: UserRound },
];

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [lastTrip, setLastTrip] = useState(getLastTrip);
  const [offlineRoutes, setOfflineRoutes] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      setLastTrip(getLastTrip());
      void listOfflineRoutes().then(routes => setOfflineRoutes(routes.length)).catch(() => setOfflineRoutes(0));
    };
    const syncViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setKeyboardOpen(window.innerHeight - vv.height > 140);
    };
    refresh();
    syncViewport();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("focus", refresh);
    window.visualViewport?.addEventListener("resize", syncViewport);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("focus", refresh);
      window.visualViewport?.removeEventListener("resize", syncViewport);
    };
  }, []);

  const current = location.split("?")[0].replace(/\/$/, "") || "/";
  const primaryLabel = useMemo(() => lastTrip ? "Ir agora" : "Planejar", [lastTrip]);

  if (keyboardOpen) return null;

  return (
    <nav
      aria-label="Navegação rápida no celular"
      className="fixed inset-x-2 bottom-2 z-[80] md:hidden"
    >
      <div
        className="rounded-[1.45rem] border border-white/10 bg-[#0E171D]/95 p-1.5 shadow-[0_20px_55px_rgba(0,0,0,.42)] backdrop-blur-2xl"
        style={{ paddingBottom: "max(.375rem, env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-5 gap-1">
          {items.map(({ href, label, icon: Icon, primary }) => {
            const active = current === href || (href !== "/" && current.startsWith(href + "/"));
            const isPrimary = primary;
            const onClick = (event: React.MouseEvent) => {
              event.preventDefault();
              if (isPrimary && lastTrip) {
                const target = appUrl(
                  "/planejar?origem=" +
                  encodeURIComponent(lastTrip.origin) +
                  "&destino=" +
                  encodeURIComponent(lastTrip.destination)
                );
                setLocation(target);
              } else {
                setLocation(appUrl(href));
              }
            };

            return (
              <a
                key={href}
                href={
                  isPrimary && lastTrip
                    ? appUrl("/planejar?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination))
                    : appUrl(href)
                }
                onClick={onClick}
                aria-current={active ? "page" : undefined}
                className={
                  isPrimary
                    ? "relative -mt-4 flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[1.15rem] border border-[#C7FF3C]/45 bg-[#C7FF3C] px-2 text-[#0B1014] shadow-[0_10px_28px_rgba(199,255,60,.22)] active:scale-[.98]"
                    : active
                      ? "flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-xl bg-white/[.08] px-1.5 text-white"
                      : "flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-xl px-1.5 text-[#788B95] active:bg-white/[.05]"
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="max-w-[4.25rem] truncate text-[0.52rem] font-black tracking-[-.01em]">
                  {isPrimary ? primaryLabel : label}
                </span>
                {href === "/salvos" && offlineRoutes > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid min-w-3.5 place-items-center rounded-full bg-[#3DE3FF] px-1 text-[0.42rem] font-black text-[#0B1014]">
                    {offlineRoutes > 9 ? "9+" : offlineRoutes}
                  </span>
                )}
              </a>
            );
          })}
        </div>

        <div className="mt-1 flex items-center justify-center gap-1.5 px-2 pb-0.5 text-[0.46rem] font-black uppercase tracking-[.12em] text-white/30">
          {online ? <Wifi className="size-2.5 text-[#C7FF3C]" aria-hidden="true" /> : <WifiOff className="size-2.5 text-[#FFC928]" aria-hidden="true" />}
          {online ? "dados novos disponíveis" : offlineRoutes ? offlineRoutes + (offlineRoutes === 1 ? " rota offline pronta" : " rotas offline prontas") : "modo local"}
        </div>
      </div>
    </nav>
  );
}
