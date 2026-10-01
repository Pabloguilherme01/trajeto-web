import { ArrowRight, Fuel, Landmark, LocateFixed, Phone, Route, Search as SearchIcon, Share2, Sparkles, Wifi, WifiOff, ShoppingBag, Utensils } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, getRecentSearches, getRecentTrips, mobilePreferenceEvent, rememberIntent, rememberSearch, type RecentTrip } from "@/lib/mobilePreferences";
import { getMobileDestinations, rememberDestinationUsage, type MobileDestination } from "@/lib/mobileDestinations";
import { LOCAL_ROUTE_PRESETS } from "@/lib/localRoutePresets";
import { LOCAL_PLACES } from "@/lib/localPlaces";
import { PUBLIC_SERVICE_SHORTCUTS } from "@/lib/publicServices";
import { buildNearbyStationsUrl, shareText, vibration } from "@/lib/mobileTools";
import { useProductEvents } from "@/hooks/useProductEvents";
import TripReadinessCard from "@/components/TripReadinessCard";
import DailyModeSelector from "@/components/DailyModeSelector";

const HOME_CITIZEN_NEEDS = PUBLIC_SERVICE_SHORTCUTS.filter(item =>
  [
    "falta luz",
    "lampada apagada",
    "coleta lixo",
    "dengue",
    "cadunico",
    "buraco rua",
    "semaforo",
    "vapt vupt",
  ].includes(item.query)
);

export default function Home() {
  const [, setLocation] = useLocation();
  const track = useProductEvents();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [lastTrip, setLastTrip] = useState(getLastTrip);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>(getRecentTrips);
  const [destinations, setDestinations] = useState<MobileDestination[]>(() => getMobileDestinations());
  const [locating, setLocating] = useState(false);
  const [shareDone, setShareDone] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLocation(appUrl("/buscar"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setLocation]);

  useEffect(() => {
    const refresh = () => {
      setLastTrip(getLastTrip());
      setRecentSearches(getRecentSearches());
      setRecentTrips(getRecentTrips());
      const nextDestinations = getMobileDestinations();
      setDestinations(nextDestinations);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
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
    if (to.length < 3) {
      setFormMessage("Informe um destino com pelo menos 3 caracteres.");
      return;
    }
    setFormMessage(null);
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
    if (locating || !navigator.geolocation) return;
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
        setFormMessage("Não foi possível obter sua localização. Digite a origem ou tente novamente.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const openLastTrip = () => {
    if (!lastTrip) return;
    rememberIntent("route");
    vibration();
    setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(lastTrip.origin) + "&destino=" + encodeURIComponent(lastTrip.destination) + "&auto=1");
  };

  const findNearby = () => {
    rememberIntent("nearby");
    if (!navigator.geolocation) {
      setLocation(appUrl("/postos") + "?q=postos");
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
        setLocation(appUrl("/postos") + "?q=postos");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const shareHome = async () => {
    try {
      const url = window.location.origin + appUrl("/");
      await shareText("Trajeto · serviços públicos, rotas, postos e lugares úteis de Águas Lindas.", url, "Trajeto");
      setShareDone(true);
      window.setTimeout(() => setShareDone(false), 1800);
    } catch {
      setFormMessage("Não foi possível abrir o compartilhamento.");
    }
  };

  return (
    <main className="premium-surface min-h-[100dvh] bg-[#0D1418] pb-28 text-white md:pb-10">
      <div className="container max-w-5xl pt-5 sm:pt-8 lg:pt-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#71818A]">{greeting}</p>
            <p className="mt-1 brand-wordmark text-[1.2rem] text-white">trajeto</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocation(appUrl("/ajuda") + "#offline-readiness-title")}
              aria-label={`Status de conexão: ${online ? "online" : "offline"}. Abrir ajuda e acesso offline`}
              className={"inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-black active:scale-[.98] " + (online ? "border-[#B7D86B]/20 bg-[#B7D86B]/5 text-[#B7D86B]" : "border-[#D8B47A]/25 bg-[#D8B47A]/5 text-[#D8B47A]")}
            >
              {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {online ? "online" : "offline"}
            </button>
            <button type="button" onClick={() => void shareHome()} aria-label="Compartilhar Trajeto" className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-white/70 active:scale-[.97]">
              <Share2 className="size-4" />
            </button>
          </div>
        </header>

        <section className="mt-5" aria-label="Busca universal">
          <button
            type="button"
            onClick={() => setLocation(appUrl("/buscar"))}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#141E23] px-4 text-left shadow-[0_12px_35px_rgba(0,0,0,.16)] active:scale-[.995]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#B7D86B]/10 text-[#B7D86B]"><SearchIcon className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-white">O que você precisa hoje?</span>
              <span className="mt-0.5 block truncate text-xs text-white/55">Ex.: UBS, falta de luz, buraco, posto ou endereço<span className="hidden sm:inline"> · Ctrl K</span></span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-white/60" />
          </button>
        </section>

        <section className="mt-8">
          <p className="soft-kicker text-xs text-[#B7D86B]">Feito para Águas Lindas</p>
          <h1 className="mobile-title mt-3 w-full min-w-0 max-w-3xl break-words font-display text-[clamp(2.45rem,9vw,5.1rem)] font-semibold leading-[.98] tracking-[-.045em]">
            O que você precisa na cidade,<br />
            <span className="text-[#B7D86B]">mais fácil de encontrar.</span>
          </h1>
          <p className="mt-5 max-w-2xl soft-copy text-sm sm:text-base">
            Serviços, contatos, rotas e lugares úteis de Águas Lindas organizados para você encontrar o próximo passo com menos esforço — inclusive offline depois da preparação.
          </p>
        </section>

        <section className="mt-6" aria-label="Ações principais">
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => lastTrip ? openLastTrip() : setLocation(appUrl("/planejar"))} className="mobile-card min-h-24 rounded-[1.35rem] border border-[#B7D86B]/20 bg-[#B7D86B]/[.08] p-4 text-left active:scale-[.99]">
              <Route className="size-4 text-[#B7D86B]" />
              <p className="mt-3 text-sm font-black">{lastTrip ? "Continuar última rota" : "Traçar um caminho"}</p>
              <p className="mt-1 text-xs text-white/65">{lastTrip ? "Retomar sem preencher tudo de novo" : "Origem, destino e rota no mesmo fluxo"}</p>
            </button>
            <button type="button" onClick={findNearby} className="mobile-card min-h-24 rounded-[1.35rem] border border-[#79C6D0]/18 bg-[#79C6D0]/[.06] p-4 text-left active:scale-[.99]">
              <Fuel className="size-4 text-[#79C6D0]" />
              <p className="mt-3 text-sm font-black">Postos por perto</p>
              <p className="mt-1 text-xs text-white/65">Veja opções próximas e informações úteis</p>
            </button>
            <button type="button" onClick={() => setLocation(appUrl("/servicos"))} className="mobile-card min-h-24 rounded-[1.35rem] border border-[#D8B47A]/18 bg-[#D8B47A]/[.05] p-4 text-left active:scale-[.99]">
              <Landmark className="size-4 text-[#D8B47A]" />
              <p className="mt-3 text-sm font-black">Resolver um serviço</p>
              <p className="mt-1 text-xs text-white/55">Saúde, documentos, benefícios e atendimento</p>
            </button>
          </div>
        </section>

        <section className="mt-5" aria-labelledby="citizen-needs-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#BDA5FF]">Precisa de ajuda com algo?</p>
              <h2 id="citizen-needs-title" className="mt-1 text-xl font-black tracking-[-.035em]">Escolha pelo que aconteceu.</h2>
              <p className="mt-1 text-xs leading-relaxed text-white/55">O Trajeto mostra o serviço, contato ou caminho mais útil.</p>
            </div>
            <button type="button" onClick={() => setLocation(appUrl("/buscar"))} className="min-h-11 shrink-0 rounded-xl border border-white/8 px-3 text-xs font-black text-white/60">Ver tudo</button>
          </div>
          <div className="mobile-scroll-x mt-3 flex snap-x gap-2 overflow-x-auto pb-1">
            {HOME_CITIZEN_NEEDS.map(item => (
              <button
                key={item.query}
                type="button"
                onClick={() => {
                  rememberSearch(item.query);
                  vibration();
                  setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent(item.query));
                }}
                className="mobile-card min-h-[5.4rem] w-[12.5rem] shrink-0 snap-start rounded-2xl border border-white/8 bg-[#141E23] p-3 text-left active:scale-[.985]"
              >
                <span className="block text-sm font-black text-white">{item.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-white/60">{item.hint}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#BDA5FF]">Resolver <ArrowRight className="size-3.5" /></span>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-5"><DailyModeSelector /></div>

        <section className="mt-4 rounded-[1.35rem] border border-[#D8B47A]/18 bg-[#D8B47A]/[.04] p-3" aria-labelledby="home-utility-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="soft-kicker text-xs text-[#D8B47A]">Em caso de urgência</p>
              <h2 id="home-utility-title" className="mt-1 text-sm font-black">Contatos que você pode precisar rápido</h2>
            </div>
            <button type="button" onClick={() => setLocation(appUrl("/servicos"))} className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/55">Central completa</button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Polícia", number: "190", href: "tel:190" },
              { label: "SAMU", number: "192", href: "tel:192" },
              { label: "Bombeiros", number: "193", href: "tel:193" },
            ].map(item => (
              <a key={item.label} href={item.href} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-[#0D1418] px-2 text-xs font-black text-white/75 transition hover:border-[#D8B47A]/25 active:scale-[.98]">
                <Phone className="size-3.5 text-[#D8B47A]" />
                <span>{item.label}</span>
                <span className="text-white/60">{item.number}</span>
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/60">Os atalhos de emergência ficam disponíveis na interface sem depender do catálogo online.</p>
        </section>

        <section className="mt-5" aria-labelledby="local-routes-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="soft-kicker text-xs text-[#79C6D0]">Destinos úteis</p>
              <h2 id="local-routes-title" className="mt-1 text-xl font-black tracking-[-.035em]">Chegue direto onde precisa.</h2>
            </div>
            <button type="button" onClick={() => setLocation(appUrl("/buscar"))} className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/55">Ver catálogo</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {LOCAL_ROUTE_PRESETS.slice(0, 6).map(route => (
              <button
                key={route.id}
                type="button"
                onClick={() => {
                  rememberIntent("route");
                  setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(route.destination) + "&auto=1");
                }}
                className="mobile-card min-h-[5.8rem] rounded-2xl border border-white/8 bg-[#141E23] p-3 text-left transition hover:border-[#79C6D0]/20 active:scale-[.985]"
              >
                <Route className="size-4 text-[#79C6D0]" aria-hidden="true" />
                <span className="mt-2 block truncate text-xs font-black">{route.label}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-white/65">{route.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5" aria-labelledby="local-guide-home-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="soft-kicker text-xs text-[#D8B47A]">Perto de você</p>
              <h2 id="local-guide-home-title" className="mt-1 text-xl font-black tracking-[-.035em]">Comer, comprar e resolver sem complicação.</h2>
            </div>
            <button type="button" onClick={() => setLocation(appUrl("/buscar") + "?q=compras")} className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/55">Abrir guia</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LOCAL_PLACES.filter(place => place.category === "alimentacao" || place.category === "compras").slice(0, 6).map(place => {
              const PlaceIcon = place.category === "alimentacao" ? Utensils : ShoppingBag;
              return (
                <button key={place.id} type="button" onClick={() => {
                  rememberSearch(place.name);
                  rememberIntent("route");
                  setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(place.mapQuery) + "&auto=1");
                }} className="mobile-card min-h-[7rem] rounded-2xl border border-white/8 bg-[#141E23] p-3 text-left transition hover:border-[#D8B47A]/25 active:scale-[.985]">
                  <PlaceIcon className={"size-4 " + (place.category === "alimentacao" ? "text-[#D8B47A]" : "text-[#79C6D0]")} aria-hidden="true" />
                  <span className="mt-2 block truncate text-xs font-black">{place.name}</span>
                  <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-white/65">{place.detail}</span>
                  <span className="mt-1 block truncate text-xs text-white/60">{place.address}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7 rounded-[1.7rem] border border-white/10 bg-[#141E23] p-4 shadow-[0_22px_60px_rgba(0,0,0,.28)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#79C6D0]">Seu trajeto</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.04em]">Monte seu caminho.</h2>
            </div>
            <span className="rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1 text-xs font-bold text-white/65">simples e direto</span>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-2.5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[.12em] text-white/65">Origem</span>
              <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0D1418] px-3">
                <div className="size-2.5 rounded-full bg-[#79C6D0]" />
                <input value={origin} onChange={event => setOrigin(event.target.value)} placeholder="De onde você sai" autoComplete="street-address" autoCapitalize="words" autoCorrect="off" enterKeyHint="next" className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/60" />
                <button type="button" onClick={useLocationAsOrigin} disabled={locating} className="grid size-11 place-items-center rounded-xl text-[#79C6D0] disabled:opacity-30" aria-label="Usar minha localização como origem">
                  <LocateFixed className="size-4" />
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[.12em] text-white/65">Destino</span>
              <div className="flex items-center gap-2 rounded-2xl border border-[#B7D86B]/18 bg-[#0D1418] px-3">
                <div className="size-2.5 rounded-full bg-[#B7D86B]" />
                <input value={destination} onChange={event => setDestination(event.target.value)} placeholder="Para onde você vai" autoComplete="street-address" autoCapitalize="words" autoCorrect="off" enterKeyHint="go" className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/60" />
              </div>
            </label>

            <button type="submit" disabled={destination.trim().length < 3} className="mt-1 flex min-h-13 w-full items-center justify-between rounded-2xl bg-[#B7D86B] px-4 text-sm font-black text-[#0B1014] disabled:cursor-not-allowed disabled:opacity-35 active:scale-[.99]" aria-describedby={formMessage ? "home-form-message" : undefined}>
              <span>{locating ? "Obtendo localização…" : "Calcular rota"}</span>
              <ArrowRight className="size-5" />
            </button>
          </form>
          {formMessage && (
            <p id="home-form-message" className="mt-3 rounded-2xl border border-[#D8B47A]/20 bg-[#D8B47A]/[.05] px-3 py-2.5 text-xs font-bold text-[#FFD59B]" role="status" aria-live="polite">
              {formMessage}
            </p>
          )}

        </section>

        <details className="mt-4 rounded-[1.35rem] border border-white/8 bg-[#10191F] p-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-black">
            <span>Recursos do aparelho</span>
            <span className="text-xs font-bold uppercase tracking-[.12em] text-white/60">opcional</span>
          </summary>
          <div className="mt-3"><TripReadinessCard /></div>
        </details>

        {recentSearches.length > 0 && (
          <section className="mt-7">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[.16em] text-white/60">Consultas recentes</p>
              {shareDone && <span className="text-xs font-bold text-[#B7D86B]">Link copiado/compartilhado</span>}
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
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-white/60">
              <Sparkles className="size-3 text-[#B7D86B]" /> Atalhos salvos neste aparelho
            </div>
            <div className="mt-3 grid gap-2">
              {destinations.slice(0, 4).map(place => (
                <button key={place.id} type="button" onClick={() => { rememberDestinationUsage(place); setDestination(place.value); }} className="flex min-h-11 items-center justify-between rounded-xl bg-[#0D1418] px-3 text-left">
                  <span className="min-w-0"><span className="block truncate text-xs font-black text-white">{place.label}</span><span className="block truncate text-xs text-white/65">{place.value}</span></span>
                  <ArrowRight className="size-3.5 shrink-0 text-white/60" />
                </button>
              ))}
            </div>
          </section>
        )}

        {recentTrips.length > 0 && (
          <section className="mt-7 rounded-3xl border border-white/8 bg-white/[.025] p-4" aria-labelledby="recent-trips-title">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.16em] text-white/60">Rotas reutilizáveis</p>
                <h2 id="recent-trips-title" className="mt-1 text-lg font-black tracking-[-.035em]">Continue de onde parou.</h2>
              </div>
              <button
                type="button"
                onClick={() => setLocation(appUrl("/salvos"))}
                className="min-h-11 shrink-0 rounded-xl border border-white/8 px-3 text-xs font-black text-white/55"
              >
                Ver salvos
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {recentTrips.slice(0, 8).map((trip, index) => (
                <button
                  key={trip.origin + "::" + trip.destination}
                  type="button"
                  onClick={() => {
                    rememberIntent("route");
                    setLocation(
                      appUrl("/planejar") +
                        "?origem=" + encodeURIComponent(trip.origin) +
                        "&destino=" + encodeURIComponent(trip.destination),
                    );
                  }}
                  className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-white/8 bg-[#0D1418] p-3 text-left active:scale-[.99]"
                  aria-label={"Repetir rota " + trip.origin + " para " + trip.destination}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#B7D86B]/10 text-[#B7D86B]">
                    <Route className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black text-white">{trip.destination}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/65">{trip.origin} → destino</span>
                    <span className="mt-1 block text-xs font-bold uppercase tracking-[.1em] text-white/60">
                      {index === 0 ? "Mais recente" : "Reutilizar"}
                    </span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-white/60" />
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/60">
              Estas rotas ficam guardadas localmente como histórico. Quando uma rota é calculada com origem e destino, o Trajeto cria automaticamente uma cópia offline para contingência.
            </p>
          </section>
        )}

        {!online && (
          <section className="mt-7 rounded-3xl border border-[#D8B47A]/20 bg-[#D8B47A]/[.045] p-4">
            <div className="flex items-start gap-3">
              <WifiOff className="mt-0.5 size-4 shrink-0 text-[#D8B47A]" />
              <div><p className="text-xs font-black text-white">Modo offline</p><p className="mt-1 text-xs leading-relaxed text-white/65">Rotas e dados já guardados neste aparelho continuam disponíveis. Quando houver conexão, o Trajeto pode atualizar e enriquecer os dados.</p></div>
            </div>
          </section>
        )}

        <footer className="mt-10 pb-4 text-center text-xs leading-relaxed text-white/60">
          Dados de rota e locais são apresentados com a fonte correspondente quando disponível. O Trajeto não substitui o aplicativo de navegação.
        </footer>
      </div>
    </main>
  );
}
