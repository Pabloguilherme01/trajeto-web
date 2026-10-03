import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Database, MapPin, Search, ShieldCheck, X } from "lucide-react";
import { OfflineStationMap } from "@/components/StationMap";
import TileStationMap from "@/components/TileStationMap";
import { DestinationActions } from "@/components/DestinationActions";
import { routePresetDestination, type UnifiedDestination } from "@/lib/unifiedDestination";
import {
  BUNDLED_CITY_ATLAS,
  buildCityAtlas,
  filterCityAtlas,
  loadCityAtlasSnapshot,
  type CityAtlasLayer,
  type CityAtlasSnapshot,
} from "@/lib/cityAtlas";
import {
  LOCAL_GEOCODE_POINTS,
  resolveLocalGeocodePoint,
} from "@/lib/localGeocoding";
import { getLocalRoutePresets, ROUTE_DESTINATION_CATEGORIES, type RouteDestinationCategoryFilter } from "@/lib/localRoutePresets";
import {
  groupAnpFuelRows,
  normalizeAnpFuelRow,
  type AnpFuelRow,
} from "@shared/anpRevendedores";
import { cacheOfflineAnpSnapshot, getOfflineAnpSnapshot } from "@/lib/stationMapOffline";
import { appUrl } from "@/lib/appUrl";
import { matchesCatalogText, normalizeCatalogText } from "@/lib/catalogSearch";
import { buildDestinationPlannerUrl, plannerDestinationFromMapItem } from "@/lib/tripLinks";

export default function CityMap() {
  const [, navigate] = useLocation();
  const [anpRows, setAnpRows] = useState(() => getOfflineAnpSnapshot().rows);
  const [atlasSnapshot, setAtlasSnapshot] = useState<CityAtlasSnapshot | null>(BUNDLED_CITY_ATLAS);
  const [showAllAtlas, setShowAllAtlas] = useState(false);

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
  const [onlyStreets, setOnlyStreets] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RouteDestinationCategoryFilter>("todos");
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const destinations = useMemo(
    () => onlyStreets ? [] : getLocalRoutePresets(query, category),
    [query, category, onlyStreets]
  );
  const atlas = useMemo(() => buildCityAtlas(atlasSnapshot), [atlasSnapshot]);
  const atlasLayer = useMemo<"todos" | CityAtlasLayer>(() => {
    if (category === "todos") return "todos";
    if (category === "centro") return "referencia";
    if (category === "saude" || category === "transporte" || category === "combustivel" || category === "compras" || category === "alimentacao") {
      return category;
    }
    return "servicos";
  }, [category]);
  const atlasDestinations = useMemo(() => {
    const routeKeys = new Set(
      destinations.map(item => normalizeCatalogText(item.destination))
    );
    return filterCityAtlas(atlas, query, atlasLayer).filter(item => {
      if (onlyStreets && item.coordinateKind !== "street-midpoint") return false;
      const target = item.destination ?? item.address ?? "";
      const key = normalizeCatalogText(target);
      return Boolean(target) && (!key || !routeKeys.has(key));
    });
  }, [atlas, atlasLayer, destinations, query, onlyStreets]);
  const visibleAtlasDestinations =
    query.trim() || showAllAtlas ? atlasDestinations : atlasDestinations.slice(0, 24);
  const markers = useMemo(() => {
    const publicPoints = destinations.flatMap(item => {
      const point = resolveLocalGeocodePoint(item.destination);
      return point
        ? [
            {
              id: item.id,
              name: item.label,
              address: item.destination,
              ...point,
            },
          ]
        : [];
    });
    const atlasPoints = atlasDestinations.flatMap(item =>
      typeof item.lat === "number" && typeof item.lng === "number"
        ? [{
            id: item.id,
            name: item.name,
            address: item.destination ?? item.address ?? item.name,
            source: item.sourceLabel,
            coordinateKind: item.coordinateKind,
            lat: item.lat,
            lng: item.lng,
          }]
        : []
    );
    const stations =
      !onlyStreets && (category === "todos" || category === "combustivel")
        ? groupAnpFuelRows(anpRows).flatMap(station => {
            const lat = station.latitude,
              lng = station.longitude;
            return typeof lat === "number" &&
              typeof lng === "number" &&
              matchesCatalogText(query, [
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
    const unique = new Map(
      [...publicPoints, ...atlasPoints, ...stations].map(point => [
        point.name.toLocaleLowerCase("pt-BR") +
          "|" +
          point.lat +
          "|" +
          point.lng,
        point,
      ])
    );
    return [...unique.values()];
  }, [destinations, atlasDestinations, category, query, anpRows, onlyStreets]);
  const plan = (destination: string) =>
    navigate(buildDestinationPlannerUrl(destination));
  const emptyFallback = (
    <div className="grid min-h-[320px] place-items-center rounded-2xl bg-[#17262d] p-6 text-center">
      <div>
        <MapPin className="mx-auto size-8 text-[#C7FF3C]" />
        <p className="mt-3 font-black">Destinos disponíveis neste aparelho</p>
        <p className="mt-2 max-w-sm text-sm text-white/70">
          O mapa de ruas precisa de conexão. Use a lista abaixo para preparar
          sua viagem offline.
        </p>
      </div>
    </div>
  );
  const fallback = markers.length ? <OfflineStationMap stations={markers} itemLabel="destino" onPlanDestination={item => plan(plannerDestinationFromMapItem(item))} /> : emptyFallback;
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-32 pt-7 text-white sm:px-6">
      <p className="text-xs font-black uppercase tracking-[.16em] text-[#C7FF3C]">
        Explore Águas Lindas
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
        A cidade no seu caminho
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
        Saúde, serviços, compras e paradas. Escolha um destino e veja sua rota
        no planejador.
      </p>
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#15212a] px-4">
        <Search className="size-4 shrink-0 text-white/60" />
        <input
          aria-label="Buscar destino no mapa"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Destino, bairro ou serviço"
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        {query && <button type="button" aria-label="Limpar busca do mapa" onClick={() => setQuery("")} className="grid size-11 shrink-0 place-items-center"><X className="size-4" /></button>}
      </div>
      <div
        className="my-3 flex flex-wrap gap-2"
        aria-label="Categorias do mapa"
      >
        {ROUTE_DESTINATION_CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={!onlyStreets && category === value}
            onClick={() => { setOnlyStreets(false); setCategory(value); }}
            className={
              "min-h-11 rounded-full border px-4 text-sm font-bold " +
              (!onlyStreets && category === value
                ? "border-[#C7FF3C] bg-[#C7FF3C] text-[#102028]"
                : "border-white/15 bg-white/5 text-white/80")
            }
          >
            {label}
          </button>
        ))}
        <button type="button" aria-pressed={onlyStreets} onClick={() => { setCategory("todos"); setOnlyStreets(true); }} className={"min-h-11 rounded-full border px-4 text-sm font-bold " + (onlyStreets ? "border-amber-300 bg-amber-300 text-[#102028]" : "border-white/15 bg-white/5 text-white/80")}>Ruas e avenidas</button>
      </div>
      <section
        aria-label="Mapa da cidade"
        className="overflow-hidden rounded-3xl border border-white/15 shadow-2xl"
      >
        {online && markers.length ? (
          <TileStationMap
            stations={markers}
            selectionLabel="Escolher destino no mapa"
            onPlanDestination={item => plan(plannerDestinationFromMapItem(item))}
            fallback={fallback}
          />
        ) : (
          fallback
        )}
      </section>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/65">
        <span>
          {markers.length} posições cadastradas · {destinations.length + atlasDestinations.length} destinos
          na lista
        </span>
        <Link
          href={appUrl("/mapa/postos")}
          className="flex min-h-11 items-center rounded-xl border border-white/15 px-3 font-bold"
        >
          Mapa e consulta de postos
        </Link>
      </div>
      <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-white/60">
        <ShieldCheck className="size-4 shrink-0" />O mapa não solicita sua
        localização. Somente destinos com coordenadas cadastradas aparecem como
        marcadores; os demais continuam na lista.
      </p>
      <section aria-labelledby="city-destinations" className="mt-6">
        <h2 id="city-destinations" className="text-lg font-black">
          Escolha sua próxima parada
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map(item => (
            <article
              key={item.id}
              className="min-w-0 rounded-2xl border border-white/10 bg-gradient-to-br from-[#182a33] to-[#10191f] p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <MapPin className="mt-1 size-5 shrink-0 text-[#C7FF3C]" />
                <div className="min-w-0">
                  <p className="break-words text-sm font-black">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">{item.detail}</p>
                </div>
              </div>
              <div className="mt-3">
                <DestinationActions destination={routePresetDestination(item)} compact />
              </div>
            </article>
          ))}
        </div>
        {!destinations.length && (
          <p role="status" className="mt-3 text-sm text-white/70">
            Nenhum destino encontrado. Tente outro nome ou categoria.
          </p>
        )}
      </section>

      {atlasDestinations.length > 0 && (
        <section aria-labelledby="city-atlas-destinations" className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.15em] text-[#3DE3FF]">Atlas da cidade</p>
              <h2 id="city-atlas-destinations" className="mt-1 text-lg font-black">
                Mais lugares de Águas Lindas
              </h2>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-black text-white/55">
              {atlasDestinations.length}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">
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
                source: item.sourceLabel,
              };
              return (
                <article key={item.id} className="min-w-0 rounded-2xl border border-white/10 bg-[#121B22] p-4">
                  <div className="flex items-start gap-3">
                    <Database className="mt-1 size-4 shrink-0 text-[#3DE3FF]" />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black">{item.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/60">{item.detail}</p>
                      {item.address && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">{item.address}</p>}
                      <p className="mt-2 break-words text-xs leading-relaxed text-white/60">
                        {item.sourceUrl ? (
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{item.sourceLabel}</a>
                        ) : item.sourceLabel}
                      </p>
                      {typeof item.lat === "number" && typeof item.lng === "number" && (
                        <p className="mt-1 break-words text-xs text-white/60">
                          {item.coordinateKind === "street-midpoint" ? "Centro aproximado da via" : "Coordenadas cadastradas"}: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
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
          {!query.trim() && atlasDestinations.length > visibleAtlasDestinations.length && (
            <button
              type="button"
              onClick={() => setShowAllAtlas(true)}
              className="mt-3 min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black text-white/75"
            >
              Ver todos os {atlasDestinations.length} itens do Atlas
            </button>
          )}
        </section>
      )}

      <details className="mt-6 rounded-2xl border border-white/10 p-4 text-xs text-white/65">
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
