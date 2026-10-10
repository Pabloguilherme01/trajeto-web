import { businessesForMapLayer, searchBusinesses } from "@/lib/businessSearch";
import { selectCityMapItems, cachedDestinationKey, type CityMapCandidate } from "@/lib/cityMapSelection";
import { useBusinessCatalog } from "@/hooks/useBusinessCatalog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CITY_MAP_CATEGORIES, cityMapAtlasLayer, cityMapLayerUrl, isReadyRouteLayer, readCityMapLayer, type CityMapCategory, type CityMapLayer } from "@/lib/cityMapLayers";
import React from "react";
import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Database, MapPin, Search, ShieldCheck, X } from "lucide-react";
import { OfflineStationMap } from "@/components/StationMap";
import MapExplorerFrame from "@/components/MapExplorerFrame";
import TileStationMap from "@/components/TileStationMap";
import { DestinationActions } from "@/components/DestinationActions";
import QuickFilterChips from "@/components/QuickFilterChips";
import { CITY_MAP_QUICK_FILTERS, isQuickFilterValue, quickFilterCategory, quickFilterMatchesCategory } from "@/lib/quickFilterPresets";
import { routePresetDestination, type UnifiedDestination } from "@/lib/unifiedDestination";
import {
  BUNDLED_CITY_ATLAS,
  buildCityAtlas,
  filterCityAtlas,
  loadCityAtlasSnapshot,

  type CityAtlasSnapshot,
} from "@/lib/cityAtlas";
import {
  LOCAL_GEOCODE_POINTS,
  resolveLocalGeocodePoint,
} from "@/lib/localGeocoding";
import { getLocalRoutePresets } from "@/lib/localRoutePresets";
import {
  groupAnpFuelRows,
  normalizeAnpFuelRow,
  type AnpFuelRow,
} from "@shared/anpRevendedores";
import { cacheOfflineAnpSnapshot, getOfflineAnpSnapshot } from "@/lib/stationMapOffline";
import { appUrl } from "@/lib/appUrl";
import { matchesCatalogText, normalizeCatalogText } from "@/lib/catalogSearch";
import { buildDestinationPlannerUrl, plannerDestinationFromMapItem } from "@/lib/tripLinks";
import { getPreferredNavigationProvider, setPreferredNavigationProvider, type NavigationProvider } from "@/lib/mobileTools";

export default function CityMap() {
  const [, navigate] = useLocation();
  const rawSearch = useSearch();
  const initialLayer = readCityMapLayer(new URLSearchParams(rawSearch).get("camada"));
  const [onlyStreets, setOnlyStreets] = useState(() => initialLayer === "ruas");
  const [category, setCategory] = useState<CityMapCategory>(() => initialLayer === "ruas" ? "todos" : initialLayer);
  const [anpRows, setAnpRows] = useState(() => getOfflineAnpSnapshot().rows);
  const groupedAnpStations = useMemo(() => groupAnpFuelRows(anpRows), [anpRows]);
  const [atlasSnapshot, setAtlasSnapshot] = useState<CityAtlasSnapshot | null>(BUNDLED_CITY_ATLAS);
  // An atlas-only street deep link does not need the heavy business chunk.
  const businesses = useBusinessCatalog(!onlyStreets);
  const [visibleCount, setVisibleCount] = useState(24);
  const [preferredMapProvider, setPreferredMapProvider] = useState<NavigationProvider>(() =>
    getPreferredNavigationProvider()
  );

  useEffect(() => {
    let active = true;
    void loadCityAtlasSnapshot().then(snapshot => {
      if (active && snapshot) setAtlasSnapshot(snapshot);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    // The install stays light, but opening the city map should make its heavy
    // offline fallback available for the next reload.
    const controller = new AbortController();
    let warmed = false;
    const warm = () => {
      if (warmed || controller.signal.aborted) return;
      warmed = true;
      void Promise.all([
        "/data/aguas-lindas-offline-map.json",
        "/data/aguas-lindas-city-atlas.json",
      ].map(path =>
        fetch(appUrl(path), { signal: controller.signal })
          .then(response => {
            if (!response.ok) throw new Error("offline snapshot");
            return response.arrayBuffer();
          })
      )).catch(() => {
        warmed = false;
      });
    };
    const serviceWorker = navigator.serviceWorker;
    const onControllerChange = () => warm();
    if (serviceWorker?.controller) warm();
    else {
      serviceWorker?.addEventListener("controllerchange", onControllerChange, { once: true });
      void serviceWorker?.ready.then(() => {
        if (serviceWorker.controller) warm();
      }).catch(() => {});
    }
    return () => {
      controller.abort();
      serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(appUrl("/data/aguas-lindas-anp.json"), {
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error("snapshot");
        return response.json();
      })
      .then((payload: { data?: unknown[]; retrievedAt?: string }) => {
        if (controller.signal.aborted) return;
        const rows = (Array.isArray(payload.data) ? payload.data : [])
          .map(item =>
            item && typeof item === "object"
              ? normalizeAnpFuelRow(item as Record<string, unknown>)
              : null
          )
          .filter((row): row is AnpFuelRow => Boolean(row));
        if (rows.length) { setAnpRows(rows); cacheOfflineAnpSnapshot(rows, payload.retrievedAt); }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const [query, setQuery] = useState(() => new URLSearchParams(rawSearch).get("q") ?? "");
  useEffect(() => {
    const params = new URLSearchParams(rawSearch);
    const selected = readCityMapLayer(params.get("camada"));
    setQuery(params.get("q") ?? "");
    setOnlyStreets(selected === "ruas");
    setCategory(selected === "ruas" ? "todos" : selected);
  }, [rawSearch]);
  const deferredQuery = useDeferredValue(query);
  const activeLayer: CityMapLayer = onlyStreets ? "ruas" : category;
  const syncMapUrl = (nextQuery: string, layer: CityMapLayer) => {
    const previous = new URLSearchParams(rawSearch);
    const current = cityMapLayerUrl(previous.get("q") ?? "", readCityMapLayer(previous.get("camada")));
    const next = cityMapLayerUrl(nextQuery, layer);
    if (next !== current) navigate(next, { replace: true });
  };
  const applyCategory = (next: CityMapCategory) => {
    const updatedQuery = isQuickFilterValue(query, CITY_MAP_QUICK_FILTERS) &&
      !quickFilterMatchesCategory(query, next) ? "" : query;
    setOnlyStreets(false);
    setCategory(next);
    setQuery(updatedQuery);
    syncMapUrl(updatedQuery, next);
  };
  const showOnlyStreets = () => {
    const updatedQuery = isQuickFilterValue(query, CITY_MAP_QUICK_FILTERS) ? "" : query;
    setCategory("todos");
    setOnlyStreets(true);
    setQuery(updatedQuery);
    syncMapUrl(updatedQuery, "ruas");
  };
  const online = useOnlineStatus();
  const destinations = useMemo(
    () => isReadyRouteLayer(activeLayer) ? getLocalRoutePresets(deferredQuery, activeLayer) : [],
    [deferredQuery, activeLayer]
  );
  const [destinationLimit, setDestinationLimit] = useState(18);
  useEffect(() => { setDestinationLimit(18); }, [query, category, onlyStreets]);
  const displayedDestinations = destinations.slice(0, destinationLimit);
  const baseAtlas = useMemo(() => buildCityAtlas(atlasSnapshot), [atlasSnapshot]);
  useEffect(() => { setVisibleCount(24); }, [query, category, onlyStreets]);
  const atlasLayer = cityMapAtlasLayer(activeLayer);
  const atlasDestinations = useMemo(() => {
    const routeKeys = new Set(
      destinations.map(item => normalizeCatalogText(item.destination))
    );
    const publicAtlas = filterCityAtlas(baseAtlas, deferredQuery, atlasLayer).filter(item => {
      if (onlyStreets && item.coordinateKind !== "street-midpoint") return false;
      const target = item.destination ?? item.address ?? "";
      const key = cachedDestinationKey(item);
      return Boolean(target) && (item.id.startsWith("business-") || !key || !routeKeys.has(key));
    });
    const companies = onlyStreets ? [] : deferredQuery.trim()
      ? searchBusinesses(businesses.items, deferredQuery).filter(item =>
          (atlasLayer === "todos" || item.category === atlasLayer) && Boolean(item.destination ?? item.address ?? "")
        )
      : businessesForMapLayer(businesses.items, atlasLayer);
    return [...publicAtlas, ...companies];
  }, [baseAtlas, businesses.items, atlasLayer, destinations, deferredQuery, onlyStreets]);
  const visibleAtlasDestinations =
    atlasDestinations.slice(0, visibleCount);
  const markerSelection = useMemo(() => {
    const publicPoints = destinations.flatMap(item => {
      const point = resolveLocalGeocodePoint(item.destination);
      return point
        ? [
            {
              id: item.id,
              name: item.label,
              category: item.category,
              address: item.destination,
              ...point,
            },
          ]
        : [];
    });
    const stations =
      !onlyStreets && (category === "todos" || category === "combustivel")
        ? groupedAnpStations.flatMap(station => {
            const lat = station.latitude,
              lng = station.longitude;
            return typeof lat === "number" &&
              typeof lng === "number" &&
              matchesCatalogText(deferredQuery, [
                station.razaoSocial ?? "Posto",
                station.endereco ?? undefined,
              ])
              ? [
                  {
                    id: station.cnpj,
                    name: station.razaoSocial ?? "Posto",
                    source: "ANP" as const,
                    address: [station.endereco, station.bairro, station.municipio, station.uf].filter(Boolean).join(", ") || station.razaoSocial || "Posto",
                    lat,
                    lng,
                  },
                ]
              : [];
          })
        : [];
    const selection = selectCityMapItems<CityMapCandidate>([publicPoints, atlasDestinations, stations]);
    return { total: selection.total, points: selection.items.map(item => ({
      id: item.id, name: item.name, category: item.category,
      address: item.destination ?? item.address ?? item.name,
      source: item.source ?? "local" as const,
      coordinateKind: item.coordinateKind, coordinateLabel: item.coordinateLabel,
      lat: item.lat!, lng: item.lng!,
    })) };
  }, [destinations, atlasDestinations, category, deferredQuery, groupedAnpStations, onlyStreets]);
  const markers = markerSelection.points;
  const plan = (destination: string) =>
    navigate(buildDestinationPlannerUrl(destination));
  const jumpTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
  };
  const emptyFallback = (
    <div className="grid min-h-[320px] place-items-center rounded-2xl bg-muted p-6 text-center">
      <div>
        <MapPin className="mx-auto size-8 text-primary" />
        <p className="mt-3 font-black">Destinos disponíveis neste aparelho</p>
        <p className="mt-2 max-w-sm text-sm text-foreground/70">
          O mapa de ruas precisa de conexão. Use a lista abaixo para preparar
          sua viagem offline.
        </p>
      </div>
    </div>
  );
  const fallback = markers.length ? <OfflineStationMap stations={markers} showDestinationPicker={false} itemLabel="destino" onPlanDestination={item => plan(plannerDestinationFromMapItem(item))} /> : emptyFallback;
  return (
    <main className="visual-shell mx-auto min-h-screen w-full max-w-6xl px-4 pb-32 pt-7 text-foreground sm:px-6">
      <p className="text-xs font-black uppercase tracking-[.16em] text-primary">
        Explore Águas Lindas
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
        A cidade no seu caminho
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/70">
        Busque um destino e veja sua rota no planejador.
      </p>
      <p aria-live="polite" className="mt-3 break-words text-xs leading-relaxed text-foreground/60">{onlyStreets ? "Camada de ruas · sem carregar o catálogo de empresas" : businesses.loading ? "Carregando catálogo de empresas…" : businesses.error ? "Não foi possível carregar as empresas. Os outros destinos continuam disponíveis." : businesses.items.length.toLocaleString("pt-BR") + " empresas do arquivo · catálogo local"}</p>
      {!onlyStreets && businesses.error && <button type="button" onClick={businesses.retry} className="mt-2 min-h-11 rounded-xl border border-border/15 px-3 text-xs">Tentar carregar empresas novamente</button>}
      <section className="mt-5" aria-labelledby="city-search-label">
        <label id="city-search-label" htmlFor="city-map-search" className="block text-xs font-black uppercase tracking-[.14em] text-foreground/65">Buscar na cidade</label>
        <div className="premium-panel mt-2 flex min-w-0 items-center gap-2 rounded-2xl border border-border/10 bg-card px-3">
          <Search className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <input
            id="city-map-search"
            type="text"
            aria-label="Buscar destino no mapa"
            aria-describedby="city-search-help"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onBlur={event => syncMapUrl(event.currentTarget.value, activeLayer)}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }}
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Nome, CNPJ, bairro ou rua"
            className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-foreground/55"
          />
          {query && <button type="button" aria-label="Limpar busca do mapa" onClick={() => { setQuery(""); syncMapUrl("", activeLayer); }} className="grid size-11 shrink-0 place-items-center rounded-xl text-foreground/65 hover:bg-muted/[.04] hover:text-foreground"><X className="size-4" aria-hidden="true" /></button>}
        </div>
        <p id="city-search-help" className="mt-2 text-xs leading-relaxed text-foreground/60">Nome, CNPJ, bairro, rua ou atividade.</p>
      </section>
      <QuickFilterChips
        label="Filtros rápidos do mapa"
        options={CITY_MAP_QUICK_FILTERS}
        value={query}
        onPick={value => {
          setOnlyStreets(false);
          setQuery(value);
          const next = quickFilterCategory(value) ?? "todos";
          setCategory(next);
          syncMapUrl(value, next);
        }}
        className="mt-3"
      />
      <p className="mt-2 text-xs text-foreground/60" role="status" aria-live="polite" aria-busy={query !== deferredQuery}>
        {query !== deferredQuery ? "Atualizando resultados…" : query ? `${destinations.length + atlasDestinations.length} destino(s) na lista · ${markers.length} posição(ões) no mapa para “${query}”` : `${destinations.length + atlasDestinations.length} destinos na lista · ${markers.length} posições no mapa`}
      </p>
      <label className="mt-3 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border/10 bg-card px-3 py-2 text-xs font-black text-foreground">
        <span className="min-w-0">Abrir destinos com</span>
        <select
          aria-label="Aplicativo de mapa preferido"
          value={preferredMapProvider}
          onChange={event => {
            const provider = event.target.value as NavigationProvider;
            setPreferredMapProvider(provider);
            setPreferredNavigationProvider(provider);
          }}
          className="min-h-11 min-w-0 w-36 shrink-0 rounded-xl border border-border bg-background px-2 text-sm text-foreground"
        >
          <option value="google">Google Maps</option>
          <option value="waze">Waze</option>
          <option value="apple">Apple Maps</option>
          <option value="organic">Organic Maps</option>
        </select>
      </label>
      <div
        role="group"
        className="my-3 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Categorias do mapa"
      >
        {CITY_MAP_CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={!onlyStreets && category === value}
            onClick={() => applyCategory(value)}
            className={
              "min-h-11 shrink-0 snap-start rounded-full border px-4 text-sm font-bold " +
              (!onlyStreets && category === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/15 bg-muted/5 text-foreground/80")
            }
          >
            {label}
          </button>
        ))}
        <button type="button" aria-pressed={onlyStreets} onClick={showOnlyStreets} className={"min-h-11 shrink-0 snap-start rounded-full border px-4 text-sm font-bold " + (onlyStreets ? "border-warning bg-warning text-primary-foreground" : "border-border bg-muted/40 text-foreground/80")}>Ruas e avenidas</button>
      </div>
      <nav
        aria-label="Navegar entre mapa e resultados"
        className="mb-3 grid grid-cols-2 gap-2"
      >
        <button
          type="button"
          aria-controls="city-map-surface"
          onClick={() => jumpTo("city-map-surface")}
          className="min-h-11 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"
        >
          Ver mapa
        </button>
        <button
          type="button"
          aria-controls="city-destinations"
          onClick={() => jumpTo("city-destinations")}
          className="min-h-11 rounded-xl border border-border/15 bg-card px-3 text-xs font-black text-foreground"
        >
          Ver resultados
        </button>
      </nav>
      <section
        id="city-map-surface"
        tabIndex={-1}
        aria-label="Mapa da cidade"
        className="premium-card scroll-mt-4 overflow-hidden rounded-3xl border border-border/15 outline-none"
      >
        <MapExplorerFrame label="Mapa da cidade">
        {online && markers.length ? (
          <TileStationMap
            stations={markers}
            showDestinationPicker={false}
            selectionLabel="Escolher destino no mapa"
            onPlanDestination={item => plan(plannerDestinationFromMapItem(item))}
            fallback={fallback}
          />
        ) : (
          fallback
        )}
        </MapExplorerFrame>
      </section>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-foreground/65">
        <span>
          {markers.length} de {markerSelection.total} posições disponíveis · {destinations.length + atlasDestinations.length} destinos na lista
          {markerSelection.total > markers.length && " · amostra no mapa: filtre ou busque para ver um destino específico"}
        </span>
        <Link
          href={appUrl("/mapa/postos")}
          className="flex min-h-11 items-center rounded-xl border border-border/15 px-3 font-bold"
        >
          Mapa e consulta de postos
        </Link>
      </div>
      <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-foreground/60">
        <ShieldCheck className="size-4 shrink-0" />O mapa não solicita sua
        localização. Somente destinos com coordenadas cadastradas aparecem como
        marcadores; os demais continuam na lista.
      </p>
      <section
        id="city-destinations"
        tabIndex={-1}
        aria-labelledby="city-destinations-title"
        className="mt-6 scroll-mt-4 outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="city-destinations-title" className="text-lg font-black">
            Escolha sua próxima parada
          </h2>
          <button
            type="button"
            aria-controls="city-map-surface"
            onClick={() => jumpTo("city-map-surface")}
            className="min-h-10 shrink-0 rounded-xl border border-border/15 px-3 text-xs font-black text-foreground/80"
          >
            Voltar ao mapa
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {displayedDestinations.map(item => (
            <article
              key={item.id}
              className="task-surface premium-route-card min-w-0 p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <MapPin className="mt-1 size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="break-words text-sm font-black">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/65">{item.detail}</p>
                </div>
              </div>
              <div className="mt-3">
                <DestinationActions destination={routePresetDestination(item)} compact />
              </div>
            </article>
          ))}
        </div>
        {displayedDestinations.length < destinations.length && (
          <button type="button" onClick={() => setDestinationLimit(count => count + 18)}
            className="mt-3 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground">
            Mostrar mais paradas ({displayedDestinations.length} de {destinations.length})
          </button>
        )}
        {!destinations.length && !atlasDestinations.length && (
          markers.length ? (
            <p role="status" className="mt-3 text-sm text-foreground/70">
              Os resultados encontrados estão no mapa acima. Toque em um ponto para planejar a rota.
            </p>
          ) : (
            <p role="status" className="mt-3 text-sm text-foreground/70">
              Nenhum destino encontrado. Tente outro nome ou categoria.
            </p>
          )
        )}
      </section>

      {atlasDestinations.length > 0 && (
        <section aria-labelledby="city-atlas-destinations" className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.15em] text-accent">Atlas da cidade</p>
              <h2 id="city-atlas-destinations" className="mt-1 text-lg font-black">
                Mais lugares de Águas Lindas
              </h2>
            </div>
            <span className="rounded-full border border-border/10 px-2.5 py-1 text-xs font-black text-foreground/55">
              {atlasDestinations.length}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-foreground/55">
            Escolas, bairros, ruas e serviços com a fonte indicada em cada ficha. Pontos centrais de vias são referências aproximadas; confirme a entrada do destino.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleAtlasDestinations.map(item => {
              const target = item.destination ?? item.address;
              const unified: UnifiedDestination = {
                id: item.id,
                kind: item.category === "combustivel" ? "station" : "place",
                name: item.name,
                address: target ?? item.name,
                detail: item.detail,
                coordinates:
                  typeof item.lat === "number" && typeof item.lng === "number"
                    ? { lat: item.lat, lng: item.lng }
                    : null,
                source: "local" as const,
              };
              return (
                <article key={item.id} className="task-surface premium-route-card min-w-0 p-4">
                  <div className="flex items-start gap-3">
                    <Database className="mt-1 size-4 shrink-0 text-accent" />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black">{item.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/60">{item.detail}</p>
                      {item.business && <details className="mt-2 break-words text-xs text-foreground/60"><summary className="min-h-8 cursor-pointer font-bold">Dados da empresa</summary><p>Razão social: {item.business.legalName}</p><p>CNAE: {item.business.cnae} · Porte: {item.business.size}</p><p>Abertura: {item.business.opened} · Situação informada em: {item.business.statusDate}</p><p>MEI: {item.business.mei} · Simples: {item.business.simples}</p><p>{item.business.nature}</p></details>}
                      {item.coordinateLabel && typeof item.lat !== "number" && <p className="mt-1 text-xs text-warning">{item.coordinateLabel} · confirme o endereço antes de viajar</p>}
                      {item.address && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{item.address}</p>}
                      <p className="mt-2 break-words text-xs leading-relaxed text-foreground/60">
                        {item.sourceUrl ? (
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{item.sourceLabel}</a>
                        ) : item.sourceLabel}
                      </p>
                      {typeof item.lat === "number" && typeof item.lng === "number" && (
                        <p className="mt-1 break-words text-xs text-foreground/60">
                          {item.coordinateLabel || (item.coordinateKind === "street-midpoint" ? "Centro aproximado da via" : "Coordenadas cadastradas")}: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <DestinationActions destination={unified} compact />
                  </div>
                </article>
              );
            })}
          </div>
          {atlasDestinations.length > visibleAtlasDestinations.length && (
            <button
              type="button"
              onClick={() => setVisibleCount(v => v + 24)}
              className="task-action task-action-secondary mt-3"
            >
              Mostrar mais destinos ({visibleAtlasDestinations.length} de {atlasDestinations.length})
            </button>
          )}
        </section>
      )}

      <details className="mt-6 rounded-2xl border border-border/10 p-4 text-xs text-foreground/65">
        <summary className="min-h-8 cursor-pointer font-bold">
          Fontes das posições no mapa
        </summary>
        <ul className="mt-3 space-y-2">
          {LOCAL_GEOCODE_POINTS.map(point => (
            <li key={point.id}>
              <a
                href={point.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {point.name} · {point.sourceLabel}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3">
          Postos: coordenadas do cadastro local conciliado com a ANP. Confirme o
          endereço antes de sair.
        </p>
      </details>
    </main>
  );
}
