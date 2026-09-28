import {
  ArrowRight,
  Bookmark,
  CloudOff,
  Fuel,
  History,
  MapPin,
  Route,
  Sparkles,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import {
  getEconomyMode,
  getLastIntent,
  getLastStation,
  getLastTrip,
  getRecentSearches,
  mobilePreferenceEvent,
  rememberIntent,
  setEconomyMode,
} from "@/lib/mobilePreferences";
import {
  getDestinationUsage,
  getFavoriteDestination,
  getMobileDestinations,
  mobileDestinationEvent,
  rememberDestinationUsage,
} from "@/lib/mobileDestinations";
import { listOfflineRoutes, offlineRouteEvent, type OfflineRoute } from "@/lib/offlineStore";
import { vibration } from "@/lib/mobileTools";

type Action = {
  title: string;
  detail: string;
  label: string;
  href?: string;
  onClick?: () => void;
  intent?: "route" | "stations" | "nearby" | "saved";
  icon: typeof ArrowRight;
};

function formatAge(savedAt: string) {
  const time = Date.parse(savedAt);
  if (!Number.isFinite(time)) return "data indisponível";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "salva agora";
  if (minutes < 60) return `salva há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `salva há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `salva há ${days} d` : `salva em ${new Date(time).toLocaleDateString("pt-BR")}`;
}

function readState() {
  return {
    economy: getEconomyMode(),
    lastTrip: getLastTrip(),
    lastStation: getLastStation(),
    recentSearch: getRecentSearches()[0] ?? null,
    intent: getLastIntent(),
    favoriteDestination: getFavoriteDestination(getMobileDestinations(), getDestinationUsage()),
  };
}

export default function MobileCopilot() {
  const [, setLocation] = useLocation();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [offlineRoutes, setOfflineRoutes] = useState(0);
  const [offlineStorageError, setOfflineStorageError] = useState(false);
  const [latestOfflineRoute, setLatestOfflineRoute] = useState<OfflineRoute | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [state, setState] = useState(readState);

  useEffect(() => {
    const refresh = () => {
      setState(readState());
      void listOfflineRoutes().then(routes => { setOfflineStorageError(false); setOfflineRoutes(routes.length); setLatestOfflineRoute(routes[0] ?? null); }).catch(() => { setOfflineStorageError(true); setOfflineRoutes(0); setLatestOfflineRoute(null); });
    };
    const refreshNetwork = () => setOnline(navigator.onLine);

    window.addEventListener("online", refreshNetwork);
    window.addEventListener("offline", refreshNetwork);
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(mobileDestinationEvent, refresh);
    window.addEventListener(offlineRouteEvent, refresh);

    refresh();

    return () => {
      window.removeEventListener("online", refreshNetwork);
      window.removeEventListener("offline", refreshNetwork);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(mobileDestinationEvent, refresh);
      window.removeEventListener(offlineRouteEvent, refresh);
    };
  }, []);

  const findNearby = () => {
    if (locatingNearby) return;
    if (!navigator.geolocation) {
      setLocation(appUrl("/postos") + "?q=postos");
      return;
    }
    setLocatingNearby(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocatingNearby(false);
        rememberIntent("nearby");
        setLocation(
          appUrl("/postos") +
          "?q=postos&lat=" + encodeURIComponent(position.coords.latitude) +
          "&lng=" + encodeURIComponent(position.coords.longitude),
        );
      },
      () => {
        setLocatingNearby(false);
        setLocation(appUrl("/postos") + "?q=postos");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 },
    );
  };

  const primary = useMemo<Action>(() => {
    if (!online && latestOfflineRoute) {
      return {
        title: "Continue sua última rota",
        detail: latestOfflineRoute.origin + " → " + latestOfflineRoute.destination + " · " + formatAge(latestOfflineRoute.savedAt),
        label: "Abrir",
        href: appUrl("/planejar") + "?rota=" + encodeURIComponent(latestOfflineRoute.id) + "&origem=" + encodeURIComponent(latestOfflineRoute.origin) + "&destino=" + encodeURIComponent(latestOfflineRoute.destination),
        intent: "saved",
        icon: CloudOff,
      };
    }

    if (!online && offlineStorageError) {
      return {
        title: "Verifique as rotas salvas",
        detail: "O aparelho não conseguiu acessar o armazenamento offline agora.",
        label: "Tentar novamente",
        href: appUrl("/planejar?salvos=1"),
        intent: "saved",
        icon: CloudOff,
      };
    }

    if (!online && offlineRoutes > 0) {
      return {
        title: "Continue uma rota salva",
        detail: offlineRoutes + (offlineRoutes === 1 ? " rota pronta" : " rotas prontas") + " no aparelho. Abra sem recalcular.",
        label: "Continuar",
        href: appUrl("/planejar?salvos=1"),
        intent: "saved",
        icon: Bookmark,
      };
    }
    const destination = state.favoriteDestination;
    const intent = state.intent;

    if (intent === "route" && state.lastTrip) {
      return {
        title: "Retomar sua última viagem",
        detail: `${state.lastTrip.origin} → ${state.lastTrip.destination}`,
        label: "Retomar",
        href: appUrl("/planejar") + "?origem=" + encodeURIComponent(state.lastTrip.origin) + "&destino=" + encodeURIComponent(state.lastTrip.destination),
        intent: "route",
        icon: Route,
      };
    }

    if (intent === "stations" && state.lastStation) {
      return {
        title: "Voltar ao último posto",
        detail: state.lastStation.name,
        label: "Abrir",
        href: appUrl("/postos") + "?q=" + encodeURIComponent(state.lastStation.query) + "&station=" + encodeURIComponent(state.lastStation.placeId),
        intent: "stations",
        icon: Fuel,
      };
    }

    if (intent === "nearby") {
      return {
        title: "Encontrar postos por perto",
        detail: locatingNearby ? "Obtendo sua localização para ordenar os postos mais próximos." : "Use sua localização para encontrar a próxima parada.",
        label: locatingNearby ? "Localizando…" : "Perto de mim",
        onClick: findNearby,
        intent: "nearby",
        icon: MapPin,
      };
    }

    if (intent === "saved" && offlineRoutes > 0) {
      return {
        title: "Continuar uma viagem salva",
        detail: offlineStorageError ? "O armazenamento offline precisa ser verificado." : offlineRoutes === 1 ? "1 rota pronta para reabrir." : `${offlineRoutes} rotas prontas para reabrir.`,
        label: "Continuar",
        href: appUrl("/planejar?salvos=1"),
        intent: "saved",
        icon: Bookmark,
      };
    }

    if (destination) {
      return {
        title: `Ir para ${destination.label.toLowerCase()}`,
        detail: destination.value,
        label: "Ir agora",
        onClick: () => {
          vibration();
          rememberDestinationUsage(destination);
          rememberIntent("route");
          setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(destination.value));
        },
        intent: "route",
        icon: Route,
      };
    }

    if (state.lastTrip) {
      return {
        title: "Retomar sua última viagem",
        detail: `${state.lastTrip.origin} → ${state.lastTrip.destination}`,
        label: "Retomar",
        href: appUrl("/planejar") + "?origem=" + encodeURIComponent(state.lastTrip.origin) + "&destino=" + encodeURIComponent(state.lastTrip.destination),
        intent: "route",
        icon: Route,
      };
    }

    if (state.lastStation) {
      return {
        title: "Voltar ao último posto",
        detail: state.lastStation.name,
        label: "Abrir",
        href: appUrl("/postos") + "?q=" + encodeURIComponent(state.lastStation.query) + "&station=" + encodeURIComponent(state.lastStation.placeId),
        intent: "stations",
        icon: Fuel,
      };
    }

    if (state.recentSearch) {
      return {
        title: "Continuar sua última busca",
        detail: state.recentSearch,
        label: "Continuar",
        href: appUrl("/postos") + "?q=" + encodeURIComponent(state.recentSearch),
        intent: "stations",
        icon: History,
      };
    }

    return {
      title: "Encontre a próxima parada",
      detail: "Pesquise postos, compare a distância e abra a navegação.",
      label: "Encontrar postos",
      href: appUrl("/postos"),
      intent: "stations",
      icon: MapPin,
    };
  }, [online, offlineRoutes, latestOfflineRoute, state, setLocation]);

  const actions: Action[] = online
    ? [
        {
          title: "Planejar",
          detail: "Destino e parada",
          label: "Abrir",
          href: appUrl("/planejar"),
          icon: Route,
        },
        {
          title: "Salvos",
          detail: offlineRoutes ? `${offlineRoutes} rota(s) prontas` : "Rotas preparadas",
          label: "Abrir",
          href: appUrl("/planejar?salvos=1"),
          icon: Bookmark,
        },
      ]
    : [];

  return (
    <section className="border-y border-white/8 bg-[#0F171D] py-5 md:hidden" aria-labelledby="mobile-copilot-title">
      <div className="container">
        <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#111A21] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.15em] text-[#3DE3FF]">
                  <Sparkles className="size-3.5" /> Copiloto de deslocamento
                </p>
                <h2 id="mobile-copilot-title" className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.055em] text-white">
                  {online ? "Qual é o próximo passo?" : "Continue sem internet."}
                </h2>
              </div>
              <div className={online ? "rounded-full border border-[#C7FF3C]/20 bg-[#C7FF3C]/8 p-2 text-[#C7FF3C]" : "rounded-full border border-[#FFB86B]/20 bg-[#FFB86B]/8 p-2 text-[#FFB86B]"} aria-label={online ? "Conectado" : "Offline"}>
                {online ? <Wifi className="size-4" /> : <CloudOff className="size-4" />}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#C7FF3C]/20 bg-[linear-gradient(135deg,rgba(199,255,60,.08),rgba(61,227,255,.04))] p-3.5">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]">
                  <primary.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.13em] text-[#C7FF3C]">Próxima ação</p>
                  <p className="mt-1 text-sm font-extrabold text-white">{primary.title}</p>
                  <p className="mt-0.5 truncate text-[0.68rem] text-[#A8C8CF]">{primary.detail}</p>
                </div>
                {primary.href ? (
                  <a href={primary.href} onClick={() => rememberIntent(primary.intent ?? "route")} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#C7FF3C] px-3 text-[0.65rem] font-black text-[#0B1014] active:scale-[.98]">
                    {primary.label}<ArrowRight className="size-3.5" />
                  </a>
                ) : (
                  <button type="button" onClick={primary.onClick} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[#C7FF3C] px-3 text-[0.65rem] font-black text-[#0B1014] active:scale-[.98]">
                    {primary.label}<ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className={`mt-3 grid gap-2 ${actions.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {actions.map(action => (
                <a key={action.title} href={action.href} className="min-h-16 min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition active:scale-[.98]">
                  <action.icon className="size-4 text-[#3DE3FF]" />
                  <p className="mt-2 truncate text-xs font-extrabold text-white">{action.title}</p>
                  <p className="mt-0.5 truncate text-[0.58rem] text-[#7F919A]">{action.detail}</p>
                </a>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {state.economy && (
                <button type="button" onClick={() => { setEconomyMode(false); setState(readState()); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#3DE3FF]/20 bg-[#3DE3FF]/6 px-3 text-[0.6rem] font-bold text-[#A9DCE5]">
                  Economia ativa
                </button>
              )}
              {!online && latestOfflineRoute && <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#FFB86B]/20 bg-[#FFB86B]/6 px-3 text-[0.6rem] font-bold text-[#FFD1A8]">Cópia local pronta</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
