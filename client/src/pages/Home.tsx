import { ArrowRight, Fuel, HeartPulse, Landmark, LocateFixed, Map, MapPin, Phone, Route, Search as SearchIcon, Share2, Siren, Sparkles, Wifi, WifiOff, ShoppingBag, Utensils } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { getLastTrip, getRecentSearches, getRecentTrips, mobilePreferenceEvent, rememberIntent, rememberSearch, type RecentTrip } from "@/lib/mobilePreferences";
import { getMobileDestinations, rememberDestinationUsage, type MobileDestination } from "@/lib/mobileDestinations";
import { LOCAL_ROUTE_PRESETS } from "@/lib/localRoutePresets";
import { LOCAL_PLACES } from "@/lib/localPlaces";
import { buildNearbyStationsUrl, shareText, vibration } from "@/lib/mobileTools";
import { useProductEvents } from "@/hooks/useProductEvents";
import { PRIVATE_LOCATION_LABEL, clearPrivateLocationHandoff, isCurrentLocationLabel, setPrivateLocationHandoff } from "@/lib/locationPrivacy";
import { buildReusableTripPlannerUrl } from "@/lib/tripLinks";
import TripReadinessCard from "@/components/TripReadinessCard";
import ReadyRouteShortcuts from "@/components/ReadyRouteShortcuts";
import DailyModeSelector from "@/components/DailyModeSelector";
import { localDataEvent } from "@/lib/localData";

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
  const [originPrivate, setOriginPrivate] = useState(false);
  const [shareDone, setShareDone] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const locationRequest = useRef(0);

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
    const onDataCleared = () => {
      // A GPS response requested before deletion must not restore private data.
      locationRequest.current += 1;
      setLocating(false);
      setOrigin("");
      setDestination("");
      setOriginPrivate(false);
      setFormMessage(null);
      refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(mobilePreferenceEvent, refresh);
    window.addEventListener(localDataEvent, onDataCleared);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(mobilePreferenceEvent, refresh);
      window.removeEventListener(localDataEvent, onDataCleared);
      locationRequest.current += 1;
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
    if (from && !originPrivate) rememberSearch(from);
    rememberSearch(to);
    track("route_open", to);
    vibration();
    const params = new URLSearchParams({ destino: to, auto: "1" });
    if (originPrivate) params.set("local", "1");
    else if (from) params.set("origem", from);
    setLocation(appUrl("/planejar") + "?" + params.toString());
  };

  const useLocationAsOrigin = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      setFormMessage("Localização não disponível neste navegador. Digite sua origem para continuar.");
      return;
    }
    setFormMessage(null);
    setLocating(true);
    const request = ++locationRequest.current;
    rememberIntent("route");
    navigator.geolocation.getCurrentPosition(
      position => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        setPrivateLocationHandoff({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setOriginPrivate(true);
        setOrigin(PRIVATE_LOCATION_LABEL);
        vibration(16);
      },
      () => {
        if (request !== locationRequest.current) return;
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
    setLocation(buildReusableTripPlannerUrl(lastTrip, { auto: true }));
  };

  const findNearby = () => {
    rememberIntent("nearby");
    vibration(12);
    setLocation(buildNearbyStationsUrl(appUrl("/postos")));
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
    <main className="premium-surface min-h-[100dvh] max-w-full overflow-x-clip bg-[#0B1014] pb-28 text-white md:pb-10">
      <div className="container min-w-0 max-w-5xl overflow-x-clip pt-5 sm:pt-8 lg:pt-12">
        <header className="flex min-w-0 items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#71818A]">{greeting}</p>
            <p className="mt-1 brand-wordmark text-[1.2rem] text-white">trajeto</p>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
            <span className={"inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-black " + (online ? "border-[#C7FF3C]/20 bg-[#C7FF3C]/5 text-[#C7FF3C]" : "border-[#FFB86B]/25 bg-[#FFB86B]/5 text-[#FFB86B]")}>
              {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {online ? "online" : "offline"}
            </span>
            <button type="button" onClick={() => void shareHome()} aria-label="Compartilhar Trajeto" className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-white/70 active:scale-[.97]">
              <Share2 className="size-4" />
            </button>
          </div>
        </header>

        <section className="mt-5" aria-label="Busca universal">
          <button
            type="button"
            onClick={() => setLocation(appUrl("/buscar"))}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#121B22] px-4 text-left shadow-[0_12px_35px_rgba(0,0,0,.16)] active:scale-[.995]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><SearchIcon className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-white">O que você procura?</span>
              <span className="mt-0.5 block truncate text-xs text-white/60">Serviço, posto, endereço ou bairro<span className="hidden sm:inline"> · Ctrl/⌘ K</span></span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-white/60" />
          </button>
        </section>

        <section className="home-hero mt-6 sm:mt-8">
          <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[.14em] text-[#C7FF3C]">Águas Lindas na mão</p>
          <h1 className="mobile-title mt-2 max-w-3xl font-display text-[clamp(1.65rem,6.5vw,4.8rem)] font-semibold leading-[1.08] sm:leading-[.94] tracking-[-.065em]">
            Resolva na cidade.<br />
            <span className="text-[#C7FF3C]">Chegue onde precisa.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/72 sm:mt-5 sm:text-base">
            Escolha seu destino. Encontre rotas e serviços em Águas Lindas.
          </p>
          </div>
          <button type="button" onClick={() => setLocation(appUrl("/mapa"))}
            className="city-explore-card" aria-label="Explorar mapa da cidade">
            <span className="city-explore-art" aria-hidden="true"><Map className="size-14" /><span className="city-explore-pin"><MapPin className="size-5" /></span></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-widest text-[#3DE3FF]">Explore a cidade</span><span className="mt-1 block text-lg font-black text-white">Seu próximo destino</span><span className="mt-1 block text-sm leading-relaxed text-white/70">Veja lugares e trajetos no mapa.</span></span>
            <ArrowRight className="size-5 shrink-0 text-[#3DE3FF]" aria-hidden="true" />
          </button>
        </section>

        <section className="premium-panel mt-4 min-w-0 overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_18px_48px_rgba(0,0,0,.24)] sm:mt-6 sm:p-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#3DE3FF]">Rota rápida</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.04em]">Para onde você vai?</h2>
            </div>
            <span className="hidden rounded-full border border-white/8 bg-white/[.03] px-2.5 py-1 text-xs font-bold text-white/65 min-[360px]:inline-flex">sem cadastro</span>
          </div>

          <form onSubmit={submit} className="mt-4 space-y-2.5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[.12em] text-white/65">Origem</span>
              <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-[#0B1014] px-3">
                <div className="size-2.5 rounded-full bg-[#3DE3FF]" />
                <input value={origin} onChange={event => { clearPrivateLocationHandoff(); setOriginPrivate(false); setOrigin(event.target.value); }} placeholder="De onde você sai" autoComplete="street-address" enterKeyHint="next" className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/60" />
                <button type="button" onClick={useLocationAsOrigin} disabled={locating} className="grid size-11 place-items-center rounded-xl text-[#3DE3FF] disabled:opacity-30" aria-label="Usar minha localização como origem">
                  <LocateFixed className="size-4" />
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[.12em] text-white/65">Destino</span>
              <div className="flex items-center gap-2 rounded-2xl border border-[#C7FF3C]/18 bg-[#0B1014] px-3">
                <div className="size-2.5 rounded-full bg-[#C7FF3C]" />
                <input value={destination} onChange={event => setDestination(event.target.value)} placeholder="Para onde você vai" autoComplete="street-address" enterKeyHint="done" className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/60" />
              </div>
            </label>

            <button type="submit" disabled={destination.trim().length < 3} className="mt-1 flex min-h-13 w-full items-center justify-between rounded-2xl bg-[#C7FF3C] px-4 text-sm font-black text-[#0B1014] disabled:cursor-not-allowed disabled:opacity-35 active:scale-[.99]" aria-describedby={formMessage ? "home-form-message" : undefined}>
              <span>{locating ? "Obtendo localização…" : "Calcular rota"}</span>
              <ArrowRight className="size-5" />
            </button>
          </form>
          {formMessage && (
            <p id="home-form-message" className="mt-3 rounded-2xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.05] px-3 py-2.5 text-xs font-bold text-[#FFD59B]" role="status" aria-live="polite">
              {formMessage}
            </p>
          )}

        </section>


        <section className="mt-5" aria-label="Ações principais">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => lastTrip ? openLastTrip() : setLocation(appUrl("/planejar"))} className="mobile-card col-span-2 min-h-[5.75rem] rounded-[1.35rem] border border-[#C7FF3C]/25 bg-[#C7FF3C]/[.09] p-4 text-left active:scale-[.99] sm:col-span-1 sm:min-h-24">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/12 text-[#C7FF3C]"><Route className="size-4" /></span>
                <ArrowRight className="size-4 shrink-0 text-[#C7FF3C]/80" />
              </div>
              <p className="mt-2 text-sm font-black">{lastTrip ? (isCurrentLocationLabel(lastTrip.origin) ? "Retomar último destino" : "Continuar última rota") : "Planejar uma rota"}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{lastTrip ? (isCurrentLocationLabel(lastTrip.origin) ? "Confirme sua localização para refazer a rota." : "Retome sua última viagem em um toque.") : "Origem, destino e rota sem cadastro."}</p>
            </button>
            <button type="button" onClick={findNearby} className="mobile-card min-h-[6.2rem] rounded-[1.35rem] border border-[#3DE3FF]/18 bg-[#3DE3FF]/[.06] p-3.5 text-left active:scale-[.99] sm:min-h-24 sm:p-4">
              <Fuel className="size-4 text-[#3DE3FF]" />
              <p className="mt-2.5 text-sm font-black">Postos</p>
              <p className="mt-1 text-xs leading-snug text-white/68">Perto de você</p>
            </button>
            <button type="button" onClick={() => setLocation(appUrl("/servicos"))} className="mobile-card min-h-[6.2rem] rounded-[1.35rem] border border-[#FFB86B]/18 bg-[#FFB86B]/[.05] p-3.5 text-left active:scale-[.99] sm:min-h-24 sm:p-4">
              <Landmark className="size-4 text-[#FFB86B]" />
              <p className="mt-2.5 text-sm font-black">Serviços</p>
              <p className="mt-1 text-xs leading-snug text-white/68">Saúde e cidadania</p>
            </button>
          </div>
        </section>

        <ReadyRouteShortcuts />

        <div className="mt-4 sm:mt-5"><DailyModeSelector /></div>

        <section className="mt-4 rounded-[1.35rem] border border-[#FFB86B]/18 bg-[#FFB86B]/[.04] p-3" aria-labelledby="home-utility-title">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.15em] text-[#FFB86B]">Utilidade imediata</p>
              <h2 id="home-utility-title" className="mt-1 text-sm font-black">Precisa resolver agora?</h2>
            </div>
            <button type="button" onClick={() => setLocation(appUrl("/servicos"))} aria-label="Central completa" className="min-h-11 rounded-xl border border-white/8 px-3 text-xs font-black text-white/55">Ver serviços</button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Polícia", number: "190", href: "tel:190" },
              { label: "SAMU", number: "192", href: "tel:192" },
              { label: "Bombeiros", number: "193", href: "tel:193" },
            ].map(item => (
              <a key={item.label} href={item.href} className="inline-flex min-h-[4.25rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/8 bg-[#0B1014] px-1.5 py-2 text-center text-xs font-black text-white/75 transition hover:border-[#FFB86B]/25 active:scale-[.98]">
                <Phone className="size-3.5 text-[#FFB86B]" />
                <span className="max-w-full break-words">{item.label}</span>
                <span className="text-white/60">{item.number}</span>
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/60">Os atalhos de emergência ficam disponíveis na interface sem depender do catálogo online.</p>
        </section>

        <section className="mt-5" aria-labelledby="local-routes-title">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-2 sm:flex-nowrap sm:gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#3DE3FF]">Rotas locais</p>
              <h2 id="local-routes-title" className="mt-1 text-xl font-black tracking-[-.035em]">Já deixe o destino pronto.</h2>
            </div>
            <button type="button" onClick={() => setLocation(appUrl("/buscar"))} className="min-h-11 max-w-full shrink-0 rounded-xl border border-white/8 px-3 text-xs font-black text-white/55">Ver catálogo</button>
          </div>
          <div className="mobile-scroll-x mt-3 flex max-w-full snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0">
            {LOCAL_ROUTE_PRESETS.slice(0, 10).map(route => (
              <button
                key={route.id}
                type="button"
                onClick={() => {
                  rememberIntent("route");
                  setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(route.destination) + "&auto=1");
                }}
                className="mobile-card min-h-[5.8rem] w-[min(46%,10rem)] min-w-[8rem] max-w-[calc(100vw-2rem)] shrink-0 snap-start rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left transition hover:border-[#3DE3FF]/20 active:scale-[.985] sm:w-auto sm:min-w-0 sm:shrink"
              >
                <Route className="size-4 text-[#3DE3FF]" aria-hidden="true" />
                <span className="mt-2 block break-words text-sm font-black">{route.label}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-white/65">{route.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5" aria-labelledby="local-guide-home-title">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-2 sm:flex-nowrap sm:gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#FFB86B]">Guia local</p>
              <h2 id="local-guide-home-title" className="mt-1 text-xl font-black tracking-[-.035em]">Comer, comprar, resolver.</h2>
            </div>
            <button type="button" onClick={() => setLocation(appUrl("/buscar") + "?q=compras")} className="min-h-11 max-w-full shrink-0 rounded-xl border border-white/8 px-3 text-xs font-black text-white/55">Abrir guia</button>
          </div>
          <div className="mobile-scroll-x mt-3 flex max-w-full snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {LOCAL_PLACES.filter(place => place.category === "alimentacao" || place.category === "compras").slice(0, 6).map(place => {
              const PlaceIcon = place.category === "alimentacao" ? Utensils : ShoppingBag;
              return (
                <button key={place.id} type="button" onClick={() => {
                  rememberSearch(place.name);
                  rememberIntent("route");
                  setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(place.mapQuery) + "&auto=1");
                }} className="mobile-card min-h-[6.75rem] w-[min(72%,18rem)] min-w-[11rem] max-w-[calc(100vw-2rem)] shrink-0 snap-start rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left transition hover:border-[#FFB86B]/25 active:scale-[.985] sm:w-auto sm:min-w-0 sm:shrink">
                  <PlaceIcon className={"size-4 " + (place.category === "alimentacao" ? "text-[#FFB86B]" : "text-[#3DE3FF]")} aria-hidden="true" />
                  <span className="mt-2 block break-words text-sm font-black">{place.name}</span>
                  <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-white/65">{place.detail}</span>
                  <span className="mt-1 block break-words text-xs text-white/60">{place.address}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 sm:mt-6" aria-label="Atalhos por necessidade">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-2 sm:flex-nowrap sm:gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-white/60">Resolver agora</p>
              <h2 className="mt-1 text-lg font-black tracking-[-.035em]">Acesso rápido.</h2>
            </div>
            <button type="button" onClick={() => setLocation(appUrl("/buscar"))} className="min-h-11 max-w-full shrink-0 rounded-xl border border-white/8 px-3 text-xs font-black text-white/55">Ver tudo</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Centro", hint: "Explorar a região", icon: MapPin, action: () => { rememberSearch("centro"); rememberIntent("search"); setLocation(appUrl("/buscar") + "?q=centro"); } },
              { label: "Saúde", hint: "UPA, hospital e UBS", icon: HeartPulse, action: () => setLocation(appUrl("/servicos") + "?categoria=saude") },
              { label: "Serviços", hint: "Prefeitura e cidadania", icon: Landmark, action: () => setLocation(appUrl("/servicos") + "?categoria=cidadania") },
              { label: "Emergência", hint: "Polícia, bombeiros e SAMU", icon: Siren, action: () => setLocation(appUrl("/servicos") + "?emergencia=1#emergency-strip-title") },
            ].map(item => (
              <button
                key={item.label}
                type="button"
                aria-label={item.label}
                onClick={item.action}
                className="min-h-[5.25rem] rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left transition hover:-translate-y-0.5 hover:border-white/15 active:scale-[.985]"
              >
                <item.icon className="size-4 text-[#C7FF3C]" aria-hidden="true" />
                <span className="mt-2 block text-xs font-black">{item.label}</span>
                <span className="mt-0.5 block text-xs text-white/65">{item.hint}</span>
              </button>
            ))}
          </div>
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
              {shareDone && <span className="text-xs font-bold text-[#C7FF3C]">Link copiado/compartilhado</span>}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {recentSearches.slice(0, 5).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    rememberSearch(item);
                    rememberIntent("search");
                    setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent(item));
                  }}
                  className="max-w-[13rem] shrink-0 truncate rounded-full border border-white/8 bg-white/[.035] px-3.5 py-2.5 text-xs font-bold text-white/65"
                  aria-label={"Buscar novamente: " + item}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}

        {destinations.length > 0 && (
          <section className="mt-7 rounded-3xl border border-white/8 bg-white/[.025] p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-white/60">
              <Sparkles className="size-3 text-[#C7FF3C]" /> Atalhos salvos neste aparelho
            </div>
            <div className="mt-3 grid gap-2">
              {destinations.slice(0, 4).map(place => (
                <button key={place.id} type="button" onClick={() => { rememberDestinationUsage(place); setDestination(place.value); }} className="flex min-h-11 items-center justify-between rounded-xl bg-[#0B1014] px-3 text-left">
                  <span className="min-w-0"><span className="block truncate text-xs font-black text-white">{place.label}</span><span className="block truncate text-xs text-white/65">{place.value}</span></span>
                  <ArrowRight className="size-3.5 shrink-0 text-white/60" />
                </button>
              ))}
            </div>
          </section>
        )}

        {recentTrips.length > 0 && (
          <section className="mt-7 rounded-3xl border border-white/8 bg-white/[.025] p-4" aria-labelledby="recent-trips-title">
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-2 sm:flex-nowrap sm:gap-3">
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
                    setLocation(buildReusableTripPlannerUrl(trip));
                  }}
                  className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-white/8 bg-[#0B1014] p-3 text-left active:scale-[.99]"
                  aria-label={"Repetir rota " + trip.origin + " para " + trip.destination}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
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
          <section className="mt-7 rounded-3xl border border-[#FFB86B]/20 bg-[#FFB86B]/[.045] p-4">
            <div className="flex items-start gap-3">
              <WifiOff className="mt-0.5 size-4 shrink-0 text-[#FFB86B]" />
              <div><p className="text-xs font-black text-white">Modo offline</p><p className="mt-1 text-xs leading-relaxed text-white/65">Rotas e dados já guardados neste aparelho continuam disponíveis. Quando houver conexão, o Trajeto pode atualizar e enriquecer os dados.</p></div>
            </div>
          </section>
        )}

        <footer className="mt-8 pb-4 text-center text-xs leading-relaxed text-white/60">
          Dados de rota e locais são apresentados com a fonte correspondente quando disponível. O Trajeto não substitui o aplicativo de navegação.
        </footer>
      </div>
    </main>
  );
}
