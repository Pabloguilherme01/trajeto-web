import { ArrowRight, Bookmark, Fuel, LocateFixed, Route, Share2, Sparkles, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, getRecentSearches, rememberIntent, rememberSearch } from "@/lib/mobilePreferences";
import { getMobileDestinations, type MobileDestination } from "@/lib/mobileDestinations";
import { listOfflineRoutes, offlineRouteEvent } from "@/lib/offlineStore";
import { buildNearbyStationsUrl, shareText, vibration } from "@/lib/mobileTools";
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
import { useProductEvents } from "@/hooks/useProductEvents";
import MobileCopilot from "@/components/MobileCopilot";
import MobileDataMode from "@/components/MobileDataMode";
import TripReadinessCard from "@/components/TripReadinessCard";

export default function Home() {
  const [, setLocation] = useLocation();
  const track = useProductEvents();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [lastTrip, setLastTrip] = useState(getLastTrip);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [offlineRoutes, setOfflineRoutes] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const [destinations, setDestinations] = useState<MobileDestination[]>(() => getMobileDestinations());
  const [locating, setLocating] = useState(false);
  const [shareDone, setShareDone] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setLastTrip(getLastTrip());
      setRecentSearches(getRecentSearches());
      const nextDestinations = getMobileDestinations();
      setDestinations(nextDestinations);
      void listOfflineRoutes().then(routes => { setOfflineRoutes(routes.length); }).catch(() => { setOfflineRoutes(0); });
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(offlineRouteEvent, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(offlineRouteEvent, refresh);
    };
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const from = origin.trim();
    const to = destination.trim();
    if (to.length < 3) return;
    rememberIntent("route");
    if (from) rememberSearch(from);
    rememberSearch(to);
    track("route_open", to);
    vibration();
    const params = new URLSearchParams({ destino: to });
    if (from) params.set("origem", from);
    setLocation(appUrl("/planejar") + "?" + params.toString());
  };

  const useLocationAsOrigin = () => {
    if (!online || locating || !navigator.geolocation) return;
    setLocating(true);
    rememberIntent("route");
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false);
        setOrigin(position.coords.latitude.toFixed(5) + ", " + position.coords.longitude.toFixed(5));
        vibration(16);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const openLastTrip = () => {
    if (!lastTrip) return;
    rememberIntent("route");
    vibration();
    setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination));
  };

  const findNearby = () => {
    rememberIntent("nearby");
    if (!online) {
      setLocation(appUrl("/postos") + "?q=postos");
      return;
    }
    if (!navigator.geolocation) {
      setLocation(appUrl("/postos"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false);
        vibration(16);
        setLocation(buildNearbyStationsUrl(appUrl("/postos"), position.coords.latitude, position.coords.longitude));
      },
      () => {
        setLocating(false);
        setLocation(appUrl("/postos"));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const shareHome = async () => {
    try {
      const url = window.location.origin + appUrl("/");
      await shareText("Trajeto · planeje viagens, encontre postos e guarde rotas.", url, "Trajeto");
      setShareDone(true);
      window.setTimeout(() => setShareDone(false), 1800);
    } catch {}
  };

  return (
    <main className="premium-surface min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-10">
      <div className="container max-w-5xl pt-5 sm:pt-8 lg:pt-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[0.58rem] font-black uppercase tracking-[.18em] text-[#71818A]">{greeting}</p>
            <p className="mt-1 brand-wordmark text-[1.2rem] text-white">trajeto</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={"inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[0.55rem] font-black " + (online ? "border-[#C7FF3C]/20 bg-[#C7FF3C]/5 text-[#C7FF3C]" : "border-[#FFB86B]/25 bg-[#FFB86B]/5 text-[#FFB86B]")}>
              {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {online ? "online" : "offline"}
            </span>
            <button type="button" onClick={() => void shareHome()} aria-label="Compartilhar Trajeto" className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-white/70 active:scale-[.97]">
              <Share2 className="size-4" />
            </button>
          </div>
        </header>

        <section className="mt-8">
          <p className="text-[0.62rem] font-black uppercase tracking-[.18em] text-[#C7FF3C]">Mobilidade diária</p>
          <h1 className="mobile-title mt-3 max-w-3xl font-display text-[clamp(2.8rem,10vw,5.7rem)] font-semibold leading-[.9] tracking-[-.075em]">
            Chegue melhor.<br />
            <span className="text-[#C7FF3C]">Decida antes de sair.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/50 sm:text-base">
            Um fluxo simples para planejar a rota, encontrar uma parada e abrir a navegação certa sem atravessar várias telas.
          </p>
        </section>

        <section className="mt-7 rounded-[1.7rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_22px_60px_rgba(0,0,0,.28)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.56rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">Próxima viagem</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.04em]">Planejar rota.</h2>
            </div>
            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1 text-[0.5rem] font-bold text-white/40">sem cadastro</span>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-2.5">
            <label className="block">
              <span className="mb-1.5 block text-[0.58rem] font-black uppercase tracking-[.12em] text-white/35">Origem</span>
              <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
                <div className="size-2.5 rounded-full bg-[#3DE3FF]" />
                <input value={origin} onChange={event => setOrigin(event.target.value)} placeholder="De onde você sai" autoComplete="street-address" enterKeyHint="next" className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/25" />
                <button type="button" onClick={useLocationAsOrigin} disabled={!online || locating} className="grid size-10 place-items-center rounded-xl text-[#3DE3FF] disabled:opacity-30" aria-label="Usar minha localização como origem">
                  <LocateFixed className="size-4" />
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[0.58rem] font-black uppercase tracking-[.12em] text-white/35">Destino</span>
              <div className="flex items-center gap-2 rounded-2xl border border-[#C7FF3C]/18 bg-[#0B1014] px-3">
                <div className="size-2.5 rounded-full bg-[#C7FF3C]" />
                <input value={destination} onChange={event => setDestination(event.target.value)} placeholder="Para onde você vai" autoComplete="street-address" enterKeyHint="done" className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/25" />
              </div>
            </label>

            <button type="submit" disabled={destination.trim().length < 3} className="mt-1 flex min-h-13 w-full items-center justify-between rounded-2xl bg-[#C7FF3C] px-4 text-sm font-black text-[#0B1014] disabled:cursor-not-allowed disabled:opacity-35 active:scale-[.99]">
              <span>{locating ? "Obtendo localização…" : "Calcular rota"}</span>
              <ArrowRight className="size-5" />
            </button>
          </form>

        </section>

        <MobileCopilot />

        <section className="mt-4">
          <details className="rounded-[1.35rem] border border-white/8 bg-[#10191F] p-4">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-black">
              <span>Antes de sair</span>
              <span className="text-[0.55rem] font-bold uppercase tracking-[.12em] text-white/25">checagem local</span>
            </summary>
            <div className="mt-3">
              <TripReadinessCard />
            </div>
          </details>
        </section>

        <section className="mt-4">
          <MobileDataMode />
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={openLastTrip} disabled={!lastTrip} className="mobile-card min-h-28 rounded-[1.35rem] border border-white/8 bg-[#121B22] p-4 text-left disabled:opacity-40 active:scale-[.99]">
            <Route className="size-4 text-[#C7FF3C]" />
            <p className="mt-3 text-xs font-black">Última rota</p>
            <p className="mt-1 truncate text-[0.63rem] text-white/40">{lastTrip ? lastTrip.origin + " → " + lastTrip.destination : "Ainda não há viagem registrada"}</p>
          </button>
          <button type="button" onClick={findNearby} className="mobile-card min-h-28 rounded-[1.35rem] border border-white/8 bg-[#121B22] p-4 text-left active:scale-[.99]">
            <Fuel className="size-4 text-[#3DE3FF]" />
            <p className="mt-3 text-xs font-black">Postos perto</p>
            <p className="mt-1 text-[0.63rem] text-white/40">{online ? "Abrir os postos usando sua posição" : isGitHubPagesRuntime() ? "Abrir o diretório local sem internet" : "Abrir postos salvos/cached neste aparelho"}</p>
          </button>
          <button type="button" onClick={() => setLocation(appUrl("/planejar") + "?salvos=1")} className="mobile-card min-h-28 rounded-[1.35rem] border border-white/8 bg-[#121B22] p-4 text-left active:scale-[.99]">
            <Bookmark className="size-4 text-[#BDA5FF]" />
            <p className="mt-3 text-xs font-black">Rotas salvas</p>
            <p className="mt-1 text-[0.63rem] text-white/40">{offlineRoutes > 0 ? offlineRoutes + " rota(s) disponíveis offline" : "Nenhuma rota salva offline"}</p>
          </button>
        </section>

        {recentSearches.length > 0 && (
          <section className="mt-7">
            <div className="flex items-center justify-between">
              <p className="text-[0.56rem] font-black uppercase tracking-[.16em] text-white/30">Consultas recentes</p>
              {shareDone && <span className="text-[0.56rem] font-bold text-[#C7FF3C]">Link copiado/compartilhado</span>}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {recentSearches.slice(0, 5).map(item => (
                <button key={item} type="button" onClick={() => { setDestination(item); rememberSearch(item); }} className="max-w-[13rem] shrink-0 truncate rounded-full border border-white/8 bg-white/[.035] px-3.5 py-2.5 text-xs font-bold text-white/65">
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}

        {destinations.length > 0 && (
          <section className="mt-7 rounded-3xl border border-white/8 bg-white/[.025] p-4">
            <div className="flex items-center gap-2 text-[0.56rem] font-black uppercase tracking-[.16em] text-white/30">
              <Sparkles className="size-3 text-[#C7FF3C]" /> Atalhos salvos neste aparelho
            </div>
            <div className="mt-3 grid gap-2">
              {destinations.slice(0, 4).map(place => (
                <button key={place.id} type="button" onClick={() => { rememberDestinationUsage(place); setDestination(place.value); }} className="flex min-h-11 items-center justify-between rounded-xl bg-[#0B1014] px-3 text-left">
                  <span className="min-w-0"><span className="block truncate text-xs font-black text-white">{place.label}</span><span className="block truncate text-[0.58rem] text-white/35">{place.value}</span></span>
                  <ArrowRight className="size-3.5 shrink-0 text-white/30" />
                </button>
              ))}
            </div>
          </section>
        )}

        {!online && (
          <section className="mt-7 rounded-3xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.045] p-4">
            <div className="flex items-start gap-3">
              <WifiOff className="mt-0.5 size-4 shrink-0 text-[#FFB86B]" />
              <div><p className="text-xs font-black text-white">Modo offline</p><p className="mt-1 text-[0.65rem] leading-relaxed text-white/45">Rotas que já foram salvas neste aparelho continuam disponíveis. Novas consultas precisam de internet.</p></div>
            </div>
          </section>
        )}

        <footer className="mt-10 pb-4 text-center text-[0.55rem] leading-relaxed text-white/25">
          Dados de rota e locais são apresentados com a fonte correspondente quando disponível. O Trajeto não substitui o aplicativo de navegação.
        </footer>
      </div>
    </main>
  );
}
