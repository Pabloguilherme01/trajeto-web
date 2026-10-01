import { ArrowRight, BookOpen, Compass, Fuel, HeartPulse, Landmark, MapPin, Navigation, Route, Search as SearchIcon, ShieldAlert, Siren, Store, X, Hospital, BusFront, ShoppingCart, Utensils, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { AGUAS_LINDAS_STATIONS, AGUAS_LINDAS_STATIONS_COUNT, AGUAS_LINDAS_STATIONS_UPDATED_AT, searchAguasLindasStations } from "@/lib/aguasLindasStations";
import { getRecentSearches, rememberSearch } from "@/lib/mobilePreferences";
import { getLocalRoutePresets } from "@/lib/localRoutePresets";
import { LOCAL_PLACES, LOCAL_PLACES_UPDATED_AT, searchLocalPlaces } from "@/lib/localPlaces";
import { searchPublicServices } from "@/lib/publicServices";

const googleSearch = (query: string) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);

const quickActions = [
  { label: "Postos", hint: `${AGUAS_LINDAS_STATIONS_COUNT} cadastros locais`, icon: Fuel, kind: "internal", query: "postos" },
  { label: "Rotas rápidas", hint: "UPA, hospital, centro e mais", icon: Route, kind: "routes", query: "" },
  { label: "Serviços públicos", hint: "Saúde, segurança e cidadania", icon: Landmark, kind: "services", query: "" },
  { label: "Perto de mim", hint: "Usar localização do aparelho", icon: Compass, kind: "nearby", query: "" },
  { label: "Saúde", hint: "UPA, HEAL, hospital e UBS", icon: HeartPulse, kind: "services", query: "saude" },
  { label: "Emergência", hint: "Polícia, bombeiros e SAMU", icon: Siren, kind: "services", query: "seguranca" },
  { label: "Comer", hint: "Restaurantes, lanches e café", icon: Utensils, kind: "places", query: "alimentacao" },
  { label: "Compras", hint: "Lojas, mercados e eletrônicos", icon: ShoppingBag, kind: "places", query: "compras" },
  { label: "Segurança", hint: "Delegacia e canais policiais", icon: ShieldAlert, kind: "services", query: "seguranca" },
  { label: "Educação", hint: "Escolas e rede pública", icon: BookOpen, kind: "services", query: "educacao" },
  { label: "Trânsito", hint: "Mobilidade e atendimento", icon: BusFront, kind: "services", query: "transito" },
  { label: "Farmácias", hint: "Encontrar farmácias", icon: Store, kind: "external", query: "farmácias, Águas Lindas de Goiás, GO" },
  { label: "Mercados", hint: "Mercados e atacarejos", icon: ShoppingCart, kind: "external", query: "supermercados atacadistas, Águas Lindas de Goiás, GO" },
] as const;

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const rawSearch = useSearch();
  const params = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(() => params.get("q") || "");
  const [query, setQuery] = useState(() => params.get("q") || "");
  const [recents, setRecents] = useState(getRecentSearches);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); inputRef.current?.focus(); }
      if (event.key === "Escape" && document.activeElement === inputRef.current) { inputRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const next = params.get("q") || "";
    setInput(next); setQuery(next);
  }, [params]);

  const stationResults = useMemo(() => {
    const value = query.trim();
    return value ? searchAguasLindasStations(value).slice(0, 16) : AGUAS_LINDAS_STATIONS.slice(0, 8);
  }, [query]);

  const routeResults = useMemo(() => getLocalRoutePresets(query).slice(0, 10), [query]);
  const serviceResults = useMemo(() => searchPublicServices(query).slice(0, 12), [query]);
  const placeResults = useMemo(() => searchLocalPlaces(query).slice(0, 12), [query]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) { setQuery(""); setLocation(appUrl("/buscar")); return; }
    rememberSearch(value); setRecents(getRecentSearches()); setQuery(value);
    setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent(value));
  };

  const openQuick = (action: typeof quickActions[number]) => {
    if (action.kind === "internal") { rememberSearch(action.query); setLocation(appUrl("/buscar") + "?q=postos"); return; }
    if (action.kind === "routes") { setLocation(appUrl("/buscar") + "?q="); return; }
    if (action.kind === "services") { setLocation(appUrl("/servicos") + (action.query ? "?categoria=" + encodeURIComponent(action.query) : "")); return; }
    if (action.kind === "places") { rememberSearch(action.query); setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent(action.query)); return; }
    if (action.kind === "nearby") {
      if (!navigator.geolocation) { setLocation(appUrl("/postos")); return; }
      navigator.geolocation.getCurrentPosition(
        position => setLocation(appUrl("/postos") + "?q=postos&lat=" + position.coords.latitude + "&lng=" + position.coords.longitude),
        () => setLocation(appUrl("/postos") + "?q=postos"),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
      );
      return;
    }
    window.open(googleSearch(action.query), "_blank", "noopener,noreferrer");
  };

  const openRoute = (destination: string) => {
    rememberSearch(destination);
    setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(destination) + "&auto=1");
  };

  return (
    <main className="premium-surface min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-5xl pt-5 sm:pt-8">
        <header>
          <p className="text-[0.56rem] font-black uppercase tracking-[.16em] text-[#C7FF3C]">Busca universal · Ctrl/⌘ K</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.06em] sm:text-4xl">Encontre e vá.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">As opções locais aparecem prontas em cards. Quando o Trajeto não possui um cadastro próprio, ele identifica a busca como externa em vez de inventar dados.</p>
        </header>

        <form onSubmit={submit} className="mt-5 flex min-h-14 items-center gap-2 rounded-2xl border border-[#C7FF3C]/18 bg-[#121B22] px-3 shadow-[0_12px_35px_rgba(0,0,0,.18)]">
          <SearchIcon className="size-5 shrink-0 text-[#C7FF3C]" />
          <input ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Posto, endereço, bairro ou serviço" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/25" autoComplete="off" enterKeyHint="search" aria-label="Buscar locais e serviços" aria-keyshortcuts="Control+K Meta+K" />
          <kbd className="hidden rounded-lg border border-white/8 bg-white/[.03] px-2 py-1 text-[0.5rem] font-black text-white/25 sm:inline">Ctrl K</kbd>
          {input && <button type="button" onClick={() => { setInput(""); setQuery(""); setLocation(appUrl("/buscar")); }} className="grid size-10 place-items-center rounded-xl text-white/40" aria-label="Limpar busca"><X className="size-4" /></button>}
          <button type="submit" className="grid size-10 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]" aria-label="Pesquisar"><ArrowRight className="size-4" /></button>
        </form>

        <section className="mt-4" aria-labelledby="search-primary-title">
          <div className="flex items-center justify-between gap-3"><h2 id="search-primary-title" className="text-[0.56rem] font-black uppercase tracking-[.15em] text-white/30">Comece por aqui</h2><span className="text-[0.5rem] text-white/20">1 toque</span></div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Ações essenciais">
            {quickActions.slice(0, 6).map(action => {
              const Icon = action.icon;
              return <button key={action.label} type="button" aria-label={action.label} onClick={() => openQuick(action)} className="group min-h-[6.4rem] rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#C7FF3C]/20 active:scale-[.985]">
                <span className="grid size-9 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C] group-hover:bg-[#C7FF3C]/15"><Icon className="size-4" /></span>
                <span className="mt-2 block text-xs font-black">{action.label}</span>
                <span className="mt-0.5 block text-[0.55rem] leading-snug text-white/35">{action.hint}</span>
              </button>;
            })}
          </div>
        </section>

        <section className="mt-4" aria-labelledby="search-explore-title">
          <div className="flex items-center justify-between gap-3"><h2 id="search-explore-title" className="text-[0.56rem] font-black uppercase tracking-[.15em] text-white/30">Explorar</h2><span className="text-[0.5rem] text-white/20">mais opções</span></div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Ações para explorar">
            {quickActions.slice(6).map(action => {
              const Icon = action.icon;
              return <button key={action.label} type="button" aria-label={action.label} onClick={() => openQuick(action)} className="group min-h-[5.4rem] rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#3DE3FF]/20 active:scale-[.985]">
                <span className="grid size-8 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF] group-hover:bg-[#3DE3FF]/15"><Icon className="size-4" /></span>
                <span className="mt-2 block text-xs font-black">{action.label}</span>
                <span className="mt-0.5 block text-[0.55rem] leading-snug text-white/35">{action.hint}</span>
              </button>;
            })}
          </div>
        </section>

        {recents.length > 0 && !query && <section className="mt-5">
          <p className="text-[0.54rem] font-black uppercase tracking-[.14em] text-white/25">Pesquisas recentes</p>
          <div className="mt-2 flex flex-wrap gap-2">{recents.map(item => <button key={item} type="button" onClick={() => { setInput(item); setQuery(item); setLocation(appUrl("/buscar") + "?q=" + encodeURIComponent(item)); }} className="min-h-10 rounded-full border border-white/8 bg-white/[.03] px-3 text-[0.62rem] font-bold text-white/60">{item}</button>)}</div>
        </section>}

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[0.54rem] font-black uppercase tracking-[.14em] text-[#3DE3FF]">Rotas prontas</p><h2 className="mt-1 text-xl font-black">{query ? "Atalhos relacionados" : "Use sem preencher o destino"}</h2></div>
            <span className="text-[0.55rem] text-white/25">offline · catálogo local</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {routeResults.map(item => <button key={item.id} type="button" onClick={() => openRoute(item.destination)} className="flex min-h-[4.8rem] items-center gap-3 rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left transition hover:border-[#3DE3FF]/20 active:scale-[.99]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#3DE3FF]/10 text-[#3DE3FF]"><Route className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{item.label}</span><span className="mt-0.5 block truncate text-[0.58rem] text-white/38">{item.detail}</span><span className="mt-1 block truncate text-[0.52rem] text-white/22">{item.destination}</span></span>
              <ArrowRight className="size-4 shrink-0 text-white/25" />
            </button>)}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[0.54rem] font-black uppercase tracking-[.14em] text-[#C7FF3C]">Postos de Águas Lindas</p><h2 className="mt-1 text-xl font-black">{query ? stationResults.length + " resultado(s)" : "Catálogo local"}</h2></div><span className="text-[0.55rem] text-white/25">{AGUAS_LINDAS_STATIONS_COUNT} cadastros · {AGUAS_LINDAS_STATIONS_UPDATED_AT}</span></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {stationResults.map(item => <button key={item.id} type="button" onClick={() => setLocation(appUrl("/local/" + encodeURIComponent(item.id)))} className="flex min-h-[4.8rem] items-center gap-3 rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left transition hover:border-[#C7FF3C]/20 active:scale-[.99]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><Fuel className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{item.displayName}</span><span className="mt-0.5 block line-clamp-2 text-[0.58rem] leading-snug text-white/38">{item.address || item.neighborhood || "Endereço não consolidado"}</span><span className="mt-1 block text-[0.5rem] font-bold text-white/22">{item.dataOrigin === "ANP" ? "ANP" : item.dataOrigin === "cross-check" ? "Dados cruzados" : "Catálogo local"}</span></span><ArrowRight className="size-4 shrink-0 text-white/25" /></button>)}
          </div>
        </section>

        <section className="mt-6" aria-labelledby="local-guide-title">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[0.54rem] font-black uppercase tracking-[.14em] text-[#C7FF3C]">Guia local</p><h2 id="local-guide-title" className="mt-1 text-xl font-black">{query ? "Comer, comprar e resolver" : "Lugares úteis em Águas Lindas"}</h2></div>
            <span className="text-[0.55rem] text-white/25">{LOCAL_PLACES.length} referências · {LOCAL_PLACES_UPDATED_AT}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(query ? placeResults : LOCAL_PLACES.slice(0, 8)).map(place => {
              const icon = place.category === "alimentacao" ? Utensils : place.category === "compras" ? ShoppingBag : place.category === "servicos" ? Landmark : MapPin;
              const PlaceIcon = icon;
              return (
                <button key={place.id} type="button" onClick={() => {
                  rememberSearch(place.name);
                  setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(place.mapQuery));
                }} className="flex min-h-[5.1rem] items-center gap-3 rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left transition hover:border-[#C7FF3C]/20 active:scale-[.99]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><PlaceIcon className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black">{place.name}</span>
                    <span className="mt-0.5 block truncate text-[0.58rem] text-white/40">{place.detail}</span>
                    <span className="mt-1 block truncate text-[0.5rem] text-white/22">{place.address}</span>
                  </span>
                  <span className="text-[0.5rem] font-black uppercase tracking-[.08em] text-[#3DE3FF]">Ir</span>
                </button>
              );
            })}
          </div>
          {!query && <button type="button" onClick={() => { setInput("compras"); setQuery("compras"); setLocation(appUrl("/buscar") + "?q=compras"); }} className="mt-3 min-h-11 w-full rounded-xl border border-white/8 bg-white/[.025] px-3 text-[0.58rem] font-black text-white/55">Ver mais locais de compras e serviços</button>}
        </section>

        {query && serviceResults.length > 0 && (
          <section className="mt-6">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-[0.54rem] font-black uppercase tracking-[.14em] text-[#FFB86B]">Serviços encontrados</p><h2 className="mt-1 text-xl font-black">Resultados públicos</h2></div>
              <span className="text-[0.55rem] text-white/25">{serviceResults.length} encontrados</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {serviceResults.map(service => (
                <button key={service.id} type="button" onClick={() => setLocation(appUrl("/servicos") + "?q=" + encodeURIComponent(service.name))} className="flex min-h-[4.8rem] items-center gap-3 rounded-2xl border border-white/8 bg-[#121B22] p-3 text-left transition hover:border-[#FFB86B]/25 active:scale-[.99]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFB86B]/10 text-[#FFB86B]"><Landmark className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{service.name}</span><span className="mt-0.5 block line-clamp-2 text-[0.58rem] leading-snug text-white/38">{service.description}</span><span className="mt-1 block truncate text-[0.5rem] font-bold uppercase tracking-[.1em] text-white/22">{service.sourceLabel}</span></span>
                  <ArrowRight className="size-4 shrink-0 text-white/25" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-white/8 bg-white/[.025] p-4">
          <div className="flex items-start gap-3"><Hospital className="mt-0.5 size-4 text-[#3DE3FF]" /><div><p className="text-xs font-black">Serviços públicos</p><p className="mt-1 text-[0.62rem] leading-relaxed text-white/40">Saúde, segurança, assistência, trânsito, educação e cidadania ficam disponíveis no catálogo incorporado.</p><button type="button" onClick={() => setLocation(appUrl("/servicos"))} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C7FF3C] px-3 text-[0.62rem] font-black text-[#0B1014]"><Landmark className="size-3.5" />Abrir central</button></div></div>
        </section>

        <footer className="mt-8 pb-4 text-center text-[0.54rem] text-white/25">O catálogo local permanece identificável por fonte. Consultas externas são abertas fora do catálogo do Trajeto.</footer>
      </div>
    </main>
  );
}
