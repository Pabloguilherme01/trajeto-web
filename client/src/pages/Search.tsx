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
  Database,
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
    label: "Ônibus Entorno",
    hint: "Tarifas ANTT e corredores",
    icon: BusFront,
    kind: "data",
    query: "transporte",
  },
  {
    label: "Dados oficiais",
    hint: "ANTT, CNES, Inep, PRF e IBGE",
    icon: Database,
    kind: "data",
    query: "",
  },
  {
    label: "Farmácias",
    hint: "Google Maps · online",
    icon: Store,
    kind: "external",
    query: "farmácias, Águas Lindas de Goiás, GO",
  },
  {
    label: "Mercados",
    hint: "Google Maps · online",
    icon: ShoppingCart,
    kind: "external",
    query: "supermercados atacadistas, Águas Lindas de Goiás, GO",
  },
] as const;

function ResultCard({
  icon: Icon,
  title,
  detail,
  source,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  source?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#121B22] p-3 text-left transition hover:border-[#C7FF3C]/30 active:scale-[.99]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]">
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

  const results = useMemo(() => getUniversalSearchResults(query), [query]);
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
    if (action.kind === "places") {
      search(action.query);
      return;
    }
    if (action.kind === "data") {
      setLocation(appUrl("/dados") + (action.query === "transporte" ? "#transporte" : ""));
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
    openExternal(action.query);
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
        disabled={!online && action.kind === "external"}
        className="flex min-h-20 min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-[#121B22] p-3 text-left transition hover:border-[#C7FF3C]/30 disabled:opacity-60"
      >
        <Icon className="size-5 shrink-0 text-[#C7FF3C]" />
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
    <main className="premium-surface min-h-[100dvh] w-full min-w-0 bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 pt-5 sm:px-8 sm:pt-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#C7FF3C]">
            Águas Lindas de Goiás
            <span className="hidden sm:inline"> · Ctrl/⌘ K</span>
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.06em] sm:text-4xl">
            Encontre e vá.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Busque pelo nome, bairro ou pelo que precisa resolver.
          </p>
        </header>
        <form
          onSubmit={submit}
          className="mt-4 flex min-h-14 w-full min-w-0 items-center gap-2 rounded-2xl border border-[#C7FF3C]/25 bg-[#121B22] px-3"
        >
          <SearchIcon className="size-5 shrink-0 text-[#C7FF3C]" />
          <input
            ref={inputRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="Ex.: CRAS, falta de luz, bairro"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/70"
            autoComplete="off"
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
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]"
            aria-label="Pesquisar"
          >
            <ArrowRight className="size-5" />
          </button>
        </form>
        {!online && (
          <p
            role="status"
            className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-[#DFFF9D]"
          >
            <WifiOff className="mt-0.5 size-4 shrink-0" />
            Você está offline. A busca usa os dados salvos neste aparelho.
          </p>
        )}

        {query ? (
          <div className="mt-5 space-y-5" aria-label="Resultados da busca">
            <p
              role="status"
              aria-live="polite"
              className="break-words text-sm text-white/80"
            >
              {results.total
                ? results.total + " resultado(s) para “" + query + "”"
                : "Nenhum resultado local para “" + query + "”."}
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
                        appUrl("/servicos") + "?q=" + encodeURIComponent(query)
                      )
                    }
                    className="mt-3 min-h-11 w-full rounded-xl border border-[#C7FF3C]/30 px-3 py-2 text-sm font-bold"
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
            {results.transitFares.length > 0 && (
              <section aria-labelledby="search-transit-title">
                <h2 id="search-transit-title" className="text-lg font-bold">
                  Transporte do Entorno{" "}
                  <span className="text-sm font-normal text-white/75">
                    ({results.transitFares.length})
                  </span>
                </h2>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                  {results.transitFares.slice(0, resultLimit).map(item => (
                    <ResultCard
                      key={item.id}
                      icon={BusFront}
                      title={item.origin + " → " + item.destination}
                      detail={
                        item.operator +
                        " · tarifa " +
                        item.fare.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }) +
                        " · desde " +
                        item.effectiveFrom
                      }
                      source={item.sourceLabel}
                      onClick={() =>
                        setLocation(appUrl("/dados") + "#transporte")
                      }
                    />
                  ))}
                </div>
              </section>
            )}
            {results.dataResources.length > 0 && (
              <section aria-labelledby="search-data-title">
                <h2 id="search-data-title" className="text-lg font-bold">
                  Dados e fontes{" "}
                  <span className="text-sm font-normal text-white/75">
                    ({results.dataResources.length})
                  </span>
                </h2>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                  {results.dataResources.slice(0, resultLimit).map(item => (
                    <ResultCard
                      key={item.id}
                      icon={Database}
                      title={item.title}
                      detail={item.description}
                      source={item.sourceLabel}
                      onClick={() =>
                        setLocation(
                          appUrl("/dados") +
                            "?recurso=" +
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
                      onClick={() => openRoute(item.destination)}
                    />
                  ))}
                </div>
              </section>
            )}
            {[results.stations, results.places, results.routes, results.dataResources, results.transitFares].some(
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
              className="rounded-2xl border border-white/10 bg-[#121B22] p-4"
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
                    openExternal(query + ", Águas Lindas de Goiás, GO")
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
                      className="min-h-11 max-w-full break-words rounded-2xl border border-white/15 bg-[#121B22] px-3 py-2 text-left text-sm text-white/85"
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
                className="mt-3 min-h-12 w-full rounded-xl border border-[#3DE3FF]/25 px-3 py-2 text-sm font-bold text-[#C9F7FF]"
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
                <Bookmark className="size-4 text-[#C7FF3C]" />
                Meus serviços salvos
              </Link>
              <Link
                href={appUrl("/ajuda") + "#offline-readiness-title"}
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold"
              >
                <WifiOff className="size-4 text-[#3DE3FF]" />
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
