import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Compass,
  Fuel,
  HeartPulse,
  Landmark,
  MapPin,
  Route,
  Search as SearchIcon,
  ShieldAlert,
  Siren,
  Store,
  X,
  BusFront,
  ShoppingCart,
  Utensils,
  ShoppingBag,
  WifiOff,
  Bookmark,
  ExternalLink,
  Phone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { AGUAS_LINDAS_STATIONS_COUNT } from "@/lib/aguasLindasStations";
import {
  getRecentSearches,
  rememberSearch,
  mobilePreferenceEvent,
} from "@/lib/mobilePreferences";
import {
  ALL_LOCAL_ROUTE_DESTINATIONS,
  getLocalRoutePresets,
} from "@/lib/localRoutePresets";
import { localDataEvent } from "@/lib/localData";
import { getUniversalSearchResults } from "@/lib/universalSearch";
import { PUBLIC_SERVICE_SHORTCUTS } from "@/lib/publicServices";
import { phoneHref } from "@/lib/contactActions";

const quickActions = [
  {
    label: "Serviços públicos",
    hint: "Contatos e atendimento",
    icon: Landmark,
    kind: "services",
    query: "",
  },
  {
    label: "Saúde",
    hint: "UPA, hospital e UBS",
    icon: HeartPulse,
    kind: "services",
    query: "saude",
  },
  {
    label: "Emergência",
    hint: "190, 192 e 193",
    icon: Siren,
    kind: "services",
    query: "emergencia",
  },
  {
    label: "Rotas rápidas",
    hint: "Escolha o destino",
    icon: Route,
    kind: "routes",
    query: "",
  },
  {
    label: "Postos",
    hint: AGUAS_LINDAS_STATIONS_COUNT + " cadastros locais",
    icon: Fuel,
    kind: "internal",
    query: "postos",
  },
  {
    label: "Perto de mim",
    hint: "Postos pela localização",
    icon: Compass,
    kind: "nearby",
    query: "",
  },
  {
    label: "Comer",
    hint: "Restaurantes e lanches",
    icon: Utensils,
    kind: "places",
    query: "alimentacao",
  },
  {
    label: "Compras",
    hint: "Lojas e mercados",
    icon: ShoppingBag,
    kind: "places",
    query: "compras",
  },
  {
    label: "Segurança",
    hint: "Delegacias e apoio",
    icon: ShieldAlert,
    kind: "services",
    query: "seguranca",
  },
  {
    label: "Educação",
    hint: "Escolas e rede pública",
    icon: BookOpen,
    kind: "services",
    query: "educacao",
  },
  {
    label: "Trânsito",
    hint: "Mobilidade e atendimento",
    icon: BusFront,
    kind: "services",
    query: "transito",
  },
  {
    label: "UBS e ESF",
    hint: "Unidades de saúde por bairro",
    icon: HeartPulse,
    kind: "search",
    query: "ubs",
  },
  {
    label: "CRAS e CREAS",
    hint: "Assistência social e famílias",
    icon: Landmark,
    kind: "search",
    query: "cras",
  },
  {
    label: "Documentos",
    hint: "Vapt Vupt, TRE, SINE e mais",
    icon: BookOpen,
    kind: "search",
    query: "vapt vupt",
  },
  {
    label: "Farmácias",
    hint: "Opções locais e rotas",
    icon: Store,
    kind: "search",
    query: "farmacia",
  },
  {
    label: "Mercados",
    hint: "Opções locais e rotas",
    icon: ShoppingCart,
    kind: "search",
    query: "mercado",
  },
] as const;

function ResultCard({
  icon: Icon,
  title,
  detail,
  source,
  actionLabel = "Abrir",
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  source?: string;
  actionLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#141E23] p-3.5 text-left shadow-[0_10px_28px_rgba(0,0,0,.12)] transition hover:border-[#B7D86B]/30 active:scale-[.99]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#B7D86B]/10 text-[#B7D86B]">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-bold">{title}</span>
        <span className="mt-1 block break-words text-sm leading-relaxed text-white/75">
          {detail}
        </span>
        {source && (
          <span className="mt-1 block break-words text-xs text-white/70">
            {source}
          </span>
        )}
        <span className="mt-2 inline-flex min-h-7 items-center rounded-lg bg-white/[.05] px-2 text-xs font-bold text-white/80">
          {actionLabel}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-white/70" />
    </button>
  );
}

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const rawSearch = useSearch();
  const params = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(() => params.get("q") || "");
  const [query, setQuery] = useState(() => (params.get("q") || "").trim());
  const [recents, setRecents] = useState(getRecentSearches);
  const [expanded, setExpanded] = useState(false);
  const [resultLimit, setResultLimit] = useState(6);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current)
        inputRef.current?.blur();
    };
    const refreshRecents = () => setRecents(getRecentSearches());
    const refreshNetwork = () => setOnline(navigator.onLine);
    window.addEventListener("keydown", onKey);
    window.addEventListener(mobilePreferenceEvent, refreshRecents);
    window.addEventListener(localDataEvent, refreshRecents);
    window.addEventListener("online", refreshNetwork);
    window.addEventListener("offline", refreshNetwork);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(mobilePreferenceEvent, refreshRecents);
      window.removeEventListener(localDataEvent, refreshRecents);
      window.removeEventListener("online", refreshNetwork);
      window.removeEventListener("offline", refreshNetwork);
    };
  }, []);

  useEffect(() => {
    const next = params.get("q") || "";
    setInput(next);
    setQuery(next.trim());
    setResultLimit(6);
  }, [params]);

  const liveQuery = input.trim();
  const results = useMemo(() => getUniversalSearchResults(liveQuery), [liveQuery]);
  const primaryService = results.services[0];
  const primaryPhone = primaryService?.phone ? phoneHref(primaryService.phone) : null;
  const primaryPlace = !primaryService ? results.places[0] : undefined;
  const primaryRoute = !primaryService && !primaryPlace ? results.routes[0] : undefined;
  const primaryDestination = primaryPlace
    ? { title: primaryPlace.name, detail: primaryPlace.detail + " · " + primaryPlace.address, destination: primaryPlace.mapQuery }
    : primaryRoute
      ? { title: primaryRoute.label, detail: primaryRoute.detail, destination: primaryRoute.destination }
      : null;
  const primaryStation = !primaryService && !primaryDestination ? results.stations[0] : undefined;
  const defaultRoutes = useMemo(() => getLocalRoutePresets().slice(0, 4), []);
  const search = (value: string) => {
    const next = value.trim();
    setInput(next);
    setQuery(next);
    setResultLimit(6);
    if (next) rememberSearch(next);
    setLocation(
      appUrl("/buscar") + (next ? "?q=" + encodeURIComponent(next) : "")
    );
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    search(input);
    inputRef.current?.blur();
  };
  const openExternal = (value: string) => {
    if (online)
      window.open(
        "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent(value),
        "_blank",
        "noopener,noreferrer"
      );
  };
  const openQuick = (action: (typeof quickActions)[number]) => {
    if (action.kind === "internal") {
      setLocation(appUrl("/postos") + "?q=postos");
      return;
    }
    if (action.kind === "routes") {
      setLocation(appUrl("/planejar"));
      return;
    }
    if (action.kind === "services" && action.query === "emergencia") {
      setLocation(appUrl("/servicos") + "?emergencia=1#emergency-strip-title");
      return;
    }
    if (action.kind === "services") {
      setLocation(
        appUrl("/servicos") +
          (action.query ? "?categoria=" + encodeURIComponent(action.query) : "")
      );
      return;
    }
    if (action.kind === "places" || action.kind === "search") {
      search(action.query);
      return;
    }
    if (action.kind === "nearby") {
      if (!navigator.geolocation) {
        setLocation(appUrl("/postos"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position =>
          setLocation(
            appUrl("/postos") +
              "?q=postos&lat=" +
              position.coords.latitude +
              "&lng=" +
              position.coords.longitude
          ),
        () => setLocation(appUrl("/postos") + "?q=postos"),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
      return;
    }
  };
  const openRoute = (destination: string) => {
    rememberSearch(destination);
    setLocation(
      appUrl("/planejar") +
        "?destino=" +
        encodeURIComponent(destination) +
        "&auto=1"
    );
  };
  const renderQuick = (action: (typeof quickActions)[number]) => {
    const Icon = action.icon;
    return (
      <button
        key={action.label}
        type="button"
        aria-label={action.label}
        onClick={() => openQuick(action)}
        className="flex min-h-24 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#141E23] p-3 text-left shadow-[0_10px_28px_rgba(0,0,0,.1)] transition hover:border-[#B7D86B]/30 disabled:opacity-60"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#B7D86B]/10 text-[#B7D86B]">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block break-words text-sm font-bold">
            {action.label}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-white/75">
            {action.hint}
          </span>
        </span>
      </button>
    );
  };

  return (
    <main className="premium-surface min-h-[100dvh] w-full min-w-0 bg-[#0D1418] pb-28 text-white md:pb-12">
      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 pt-5 sm:px-8 sm:pt-8">
        <header>
          <p className="soft-kicker text-xs text-[#B7D86B]">
            Busca local · Águas Lindas
            <span className="hidden sm:inline"> · Ctrl/⌘ K</span>
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.035em] sm:text-4xl">
            Encontre o que precisa.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Digite um lugar, serviço ou problema do dia a dia. O Trajeto organiza as opções para você.
          </p>
        </header>
        <form
          onSubmit={submit}
          className="mt-4 flex min-h-14 w-full min-w-0 items-center gap-2 rounded-2xl border border-[#B7D86B]/25 bg-[#141E23] px-3"
        >
          <SearchIcon className="size-5 shrink-0 text-[#B7D86B]" />
          <input
            ref={inputRef}
            value={input}
            onChange={event => {
              setInput(event.target.value);
              setResultLimit(6);
            }}
            placeholder="Ex.: UBS, CRAS, falta de luz, buraco ou bairro"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/70"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="search"
            enterKeyHint="search"
            aria-label="Buscar locais e serviços"
            aria-keyshortcuts="Control+K Meta+K"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                search("");
                inputRef.current?.focus();
              }}
              className="grid size-11 shrink-0 place-items-center rounded-xl text-white/75"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          )}
          <button
            type="submit"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#B7D86B] text-[#0B1014]"
            aria-label="Pesquisar"
          >
            <ArrowRight className="size-5" />
          </button>
        </form>
        {!online && (
          <p
            role="status"
            className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-[#DCEAB9]"
          >
            <WifiOff className="mt-0.5 size-4 shrink-0" />
            Você está offline. A busca usa os dados salvos neste aparelho.
          </p>
        )}

        {liveQuery ? (
          <div className="mt-5 space-y-5" aria-label="Resultados da busca">
            {primaryService && (
              <section
                className="rounded-[1.4rem] border border-[#B7D86B]/20 bg-[#B7D86B]/[.055] p-4 shadow-[0_14px_36px_rgba(0,0,0,.14)]"
                aria-labelledby="search-auto-answer-title"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#B7D86B]/10 text-[#B7D86B]">
                    <Sparkles className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="soft-kicker text-xs text-[#B7D86B]">
                      Encontramos isto para você
                    </p>
                    <h2 id="search-auto-answer-title" className="mt-1 text-base font-black leading-snug">
                      {primaryService.name}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-white/75">
                      {primaryService.description}
                    </p>
                    {results.services.length > 1 && (
                      <p className="mt-1 text-xs leading-relaxed text-white/60">
                        Há mais {results.services.length - 1} opção(ões) relacionada(s) logo abaixo.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setLocation(appUrl("/servicos") + "?servico=" + encodeURIComponent(primaryService.id))}
                    className="min-h-11 rounded-xl bg-[#B7D86B] px-3 text-sm font-black text-[#0B1014]"
                  >
                    Ver detalhes
                  </button>
                  {primaryService.mapQuery && (
                    <button
                      type="button"
                      onClick={() => openRoute(primaryService.mapQuery!)}
                      className="min-h-11 rounded-xl border border-[#79C6D0]/25 px-3 text-sm font-bold text-[#C7E9ED]"
                    >
                      Planejar rota
                    </button>
                  )}
                  {primaryPhone && (
                    <a
                      href={primaryPhone}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold text-white/85"
                    >
                      <Phone className="size-4" />
                      Ligar
                    </a>
                  )}
                </div>
              </section>
            )}
            {!primaryService && primaryDestination && (
              <section
                className="rounded-[1.4rem] border border-[#79C6D0]/20 bg-[#79C6D0]/[.05] p-4 shadow-[0_14px_36px_rgba(0,0,0,.14)]"
                aria-labelledby="search-auto-route-title"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#79C6D0]/10 text-[#79C6D0]">
                    <Route className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="soft-kicker text-xs text-[#79C6D0]">
                      Caminho sugerido
                    </p>
                    <h2 id="search-auto-route-title" className="mt-1 text-base font-black leading-snug">
                      {primaryDestination.title}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-white/75">
                      {primaryDestination.detail}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openRoute(primaryDestination.destination)}
                  className="mt-3 min-h-11 w-full rounded-xl bg-[#B7D86B] px-3 text-sm font-black text-[#0B1014]"
                >
                  Planejar rota
                </button>
              </section>
            )}
            {!primaryService && !primaryDestination && primaryStation && (
              <section
                className="rounded-[1.4rem] border border-[#FFB86B]/20 bg-[#FFB86B]/[.05] p-4 shadow-[0_14px_36px_rgba(0,0,0,.14)]"
                aria-labelledby="search-auto-station-title"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#FFB86B]/10 text-[#FFB86B]">
                    <Fuel className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[.12em] text-[#FFB86B]">
                      Posto que combina com a busca
                    </p>
                    <h2 id="search-auto-station-title" className="mt-1 text-base font-black leading-snug">
                      {primaryStation.displayName}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-white/75">
                      {primaryStation.address || primaryStation.neighborhood || "Consulte os detalhes do posto."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLocation(appUrl("/local/" + encodeURIComponent(primaryStation.id)))}
                  className="mt-3 min-h-11 w-full rounded-xl bg-[#B7D86B] px-3 text-sm font-black text-[#0B1014]"
                >
                  Ver posto
                </button>
              </section>
            )}
            <p
              role="status"
              aria-live="polite"
              className="break-words text-sm text-white/80"
            >
              {results.total
                ? results.total + " resultado(s) para “" + liveQuery + "”"
                : "Nenhum resultado local para “" + liveQuery + "”."}
            </p>
            {results.services.length > 0 && (
              <section aria-labelledby="search-services-title">
                <h2 id="search-services-title" className="text-lg font-bold">
                  Serviços públicos{" "}
                  <span className="text-sm font-normal text-white/75">
                    ({results.services.length})
                  </span>
                </h2>
                {results.services.length > resultLimit && (
                  <button
                    type="button"
                    onClick={() =>
                      setLocation(
                        appUrl("/servicos") + "?q=" + encodeURIComponent(liveQuery)
                      )
                    }
                    className="mt-3 min-h-11 w-full rounded-xl border border-[#B7D86B]/30 px-3 py-2 text-sm font-bold"
                  >
                    Ver todos os {results.services.length} serviços encontrados
                  </button>
                )}
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                  {results.services.slice(0, resultLimit).map(item => (
                    <ResultCard
                      key={item.id}
                      icon={Landmark}
                      title={item.name}
                      detail={item.description}
                      source={item.sourceLabel}
                      actionLabel="Abrir serviço"
                      onClick={() =>
                        setLocation(
                          appUrl("/servicos") +
                            "?servico=" +
                            encodeURIComponent(item.id)
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            )}
            {results.stations.length > 0 && (
              <section aria-labelledby="search-stations-title">
                <h2 id="search-stations-title" className="text-lg font-bold">
                  Postos{" "}
                  <span className="text-sm font-normal text-white/75">
                    ({results.stations.length})
                  </span>
                </h2>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                  {results.stations.slice(0, resultLimit).map(item => (
                    <ResultCard
                      key={item.id}
                      icon={Fuel}
                      title={item.displayName}
                      detail={
                        item.address ||
                        item.neighborhood ||
                        "Endereço não consolidado"
                      }
                      source={
                        item.dataOrigin === "ANP"
                          ? "Fonte: ANP"
                          : "Catálogo local"
                      }
                      actionLabel="Ver posto"
                      onClick={() =>
                        setLocation(
                          appUrl("/local/" + encodeURIComponent(item.id))
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            )}
            {results.places.length > 0 && (
              <section aria-labelledby="search-places-title">
                <h2 id="search-places-title" className="text-lg font-bold">
                  Lugares e comércio{" "}
                  <span className="text-sm font-normal text-white/75">
                    ({results.places.length})
                  </span>
                </h2>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                  {results.places.slice(0, resultLimit).map(item => (
                    <ResultCard
                      key={item.id}
                      icon={
                        item.category === "alimentacao"
                          ? Utensils
                          : item.category === "compras"
                            ? ShoppingBag
                            : MapPin
                      }
                      title={item.name}
                      detail={item.detail + " · " + item.address}
                      source={item.sourceLabel}
                      actionLabel="Planejar rota"
                      onClick={() => openRoute(item.mapQuery)}
                    />
                  ))}
                </div>
              </section>
            )}
            {results.routes.length > 0 && (
              <section aria-labelledby="search-routes-title">
                <h2 id="search-routes-title" className="text-lg font-bold">
                  Outros destinos{" "}
                  <span className="text-sm font-normal text-white/75">
                    ({results.routes.length})
                  </span>
                </h2>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                  {results.routes.slice(0, resultLimit).map(item => (
                    <ResultCard
                      key={item.id}
                      icon={Route}
                      title={item.label}
                      detail={item.detail}
                      actionLabel="Planejar rota"
                      onClick={() => openRoute(item.destination)}
                    />
                  ))}
                </div>
              </section>
            )}
            {[results.stations, results.places, results.routes].some(
              items => items.length > resultLimit
            ) && (
              <button
                type="button"
                onClick={() => setResultLimit(limit => limit + 12)}
                className="min-h-12 w-full rounded-xl border border-white/20 px-3 text-sm font-bold"
              >
                Mostrar mais resultados
              </button>
            )}
            <section
              className="rounded-2xl border border-white/10 bg-[#141E23] p-4"
              aria-label="Ajuda para encontrar"
            >
              <p className="text-sm leading-relaxed text-white/80">
                {results.total
                  ? "Ainda não encontrou o que precisa?"
                  : "Tente o nome do serviço ou do bairro, ou consulte a central."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={appUrl("/servicos")}
                  className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-3 text-sm font-bold"
                >
                  Abrir central de serviços
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    openExternal(liveQuery + ", Busca local · Águas Lindas, GO")
                  }
                  disabled={!online}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-bold disabled:opacity-60"
                >
                  <ExternalLink className="size-4" />
                  Buscar no Google Maps · online
                </button>
              </div>
            </section>
          </div>
        ) : (
          <>
            <section className="mt-5" aria-labelledby="search-primary-title">
              <h2
                id="search-primary-title"
                className="text-sm font-bold text-white/80"
              >
                O que você precisa?
              </h2>
              <div
                className="mt-2 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4"
                aria-label="Ações essenciais"
              >
                {quickActions.slice(0, 4).map(renderQuick)}
              </div>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls="search-more-actions"
                onClick={() => setExpanded(value => !value)}
                className="mt-2 flex min-h-11 w-full items-center justify-between rounded-xl border border-white/15 px-3 text-sm font-bold"
              >
                {expanded
                  ? "Menos opções"
                  : "Mais opções: postos, comércio e outras categorias"}
                <ChevronDown
                  className={
                    "size-4 shrink-0 " + (expanded ? "rotate-180" : "")
                  }
                />
              </button>
              <div id="search-more-actions" hidden={!expanded}>
                <div
                  className="mt-2 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3"
                  aria-label="Ações para explorar"
                >
                  {quickActions.slice(4).map(renderQuick)}
                </div>
              </div>
            </section>
            <section className="mt-5" aria-labelledby="search-needs-title">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 id="search-needs-title" className="text-sm font-bold text-white/80">
                    O que você quer resolver?
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">
                    Atalhos simples para situações comuns em Águas Lindas.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-xs font-bold text-white/60">
                  local
                </span>
              </div>
              <div className="mobile-scroll-x mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
                {PUBLIC_SERVICE_SHORTCUTS.slice(0, 8).map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => search(item.query)}
                    className="min-h-20 w-[13.5rem] shrink-0 snap-start rounded-2xl border border-white/10 bg-[#141E23] p-3 text-left"
                  >
                    <span className="block text-sm font-bold text-white">{item.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-white/65">{item.hint}</span>
                  </button>
                ))}
              </div>
            </section>
            {recents.length > 0 && (
              <section className="mt-5" aria-labelledby="search-recent-title">
                <h2
                  id="search-recent-title"
                  className="text-sm font-bold text-white/80"
                >
                  Pesquisas recentes
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recents.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => search(item)}
                      className="min-h-11 max-w-full break-words rounded-2xl border border-white/15 bg-[#141E23] px-3 py-2 text-left text-sm text-white/85"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section
              className="mt-5"
              aria-labelledby="search-default-routes-title"
            >
              <h2
                id="search-default-routes-title"
                className="text-lg font-bold"
              >
                Rotas prontas
              </h2>
              <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                {defaultRoutes.map(item => (
                  <ResultCard
                    key={item.id}
                    icon={Route}
                    title={item.label}
                    detail={item.detail}
                    onClick={() => openRoute(item.destination)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setLocation(appUrl("/planejar") + "?destinos=1")}
                className="mt-3 min-h-12 w-full rounded-xl border border-[#79C6D0]/25 px-3 py-2 text-sm font-bold text-[#C7E9ED]"
              >
                Todos os destinos disponíveis ·{" "}
                {ALL_LOCAL_ROUTE_DESTINATIONS.length} locais
              </button>
            </section>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href={appUrl("/servicos") + "?salvos=1"}
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold"
              >
                <Bookmark className="size-4 text-[#B7D86B]" />
                Meus serviços salvos
              </Link>
              <Link
                href={appUrl("/ajuda") + "#offline-readiness-title"}
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold"
              >
                <WifiOff className="size-4 text-[#79C6D0]" />
                Preparar acesso offline
              </Link>
            </div>
          </>
        )}
        <footer className="mt-6 pb-4 text-sm leading-relaxed text-white/70">
          Contatos e referências podem mudar. Confira a fonte do serviço antes
          de sair.
        </footer>
      </div>
    </main>
  );
}
