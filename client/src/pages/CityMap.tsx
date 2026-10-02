import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Database,
  Layers3,
  MapPin,
  Maximize2,
  Minimize2,
  Search,
  ShieldCheck,
  Route,
} from "lucide-react";
import { OfflineStationMap } from "@/components/StationMap";
import TileStationMap from "@/components/TileStationMap";
import {
  LOCAL_GEOCODE_POINTS,
  resolveLocalGeocodePoint,
} from "@/lib/localGeocoding";
import {
  buildCityAtlas,
  CITY_ATLAS_LAYERS,
  cityAtlasCounts,
  filterCityAtlas,
  loadCityAtlasSnapshot,
  type CityAtlasLayer,
  type CityAtlasSnapshot,
} from "@/lib/cityAtlas";
import {
  groupAnpFuelRows,
  normalizeAnpFuelRow,
  type AnpFuelRow,
} from "@shared/anpRevendedores";
import {
  cacheOfflineAnpSnapshot,
  getOfflineAnpSnapshot,
} from "@/lib/stationMapOffline";
import { appUrl } from "@/lib/appUrl";
import { matchesCatalogText } from "@/lib/catalogSearch";

type MapCategory = "todos" | CityAtlasLayer;

export default function CityMap() {
  const [, navigate] = useLocation();
  const [snapshot, setSnapshot] = useState<CityAtlasSnapshot | null>(null);
  const [anpRows, setAnpRows] = useState(() => getOfflineAnpSnapshot().rows);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MapCategory>("todos");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [expandedMap, setExpandedMap] = useState(false);
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const [showAllCatalog, setShowAllCatalog] = useState(false);

  useEffect(() => {
    let active = true;
    void loadCityAtlasSnapshot().then(value => {
      if (active) setSnapshot(value);
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
        if (rows.length) {
          setAnpRows(rows);
          cacheOfflineAnpSnapshot(rows, payload.retrievedAt);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const atlas = useMemo(() => buildCityAtlas(snapshot), [snapshot]);
  const counts = useMemo(() => cityAtlasCounts(atlas), [atlas]);
  const destinations = useMemo(
    () => filterCityAtlas(atlas, query, category),
    [atlas, query, category]
  );

  const visibleDestinations = useMemo(
    () =>
      query.trim() || showAllCatalog
        ? destinations
        : destinations.slice(0, 36),
    [destinations, query, showAllCatalog]
  );
  const hiddenDestinationCount = Math.max(
    0,
    destinations.length - visibleDestinations.length
  );

  useEffect(() => {
    setShowAllCatalog(false);
  }, [category, query]);

  const markers = useMemo(() => {
    const publicPoints = destinations.flatMap(item => {
      const point =
        typeof item.lat === "number" && typeof item.lng === "number"
          ? { lat: item.lat, lng: item.lng }
          : resolveLocalGeocodePoint(
              item.destination ?? item.address ?? item.name
            ) ??
            resolveLocalGeocodePoint(item.name);
      return point
        ? [
            {
              id: item.id,
              name: item.name,
              address: item.destination ?? item.address ?? item.name,
              source: "local" as const,
              ...point,
            },
          ]
        : [];
    });

    const stations =
      category === "todos" || category === "combustivel"
        ? groupAnpFuelRows(anpRows).flatMap(station => {
            const lat = station.latitude;
            const lng = station.longitude;
            return typeof lat === "number" &&
              typeof lng === "number" &&
              matchesCatalogText(query, [
                station.razaoSocial ?? "Posto",
                station.endereco ?? undefined,
                station.bairro ?? undefined,
              ])
              ? [
                  {
                    id: station.cnpj,
                    name: station.razaoSocial ?? "Posto",
                    source: "ANP" as const,
                    address:
                      [
                        station.endereco,
                        station.bairro,
                        station.municipio,
                        station.uf,
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                      station.razaoSocial ||
                      "Posto",
                    lat,
                    lng,
                  },
                ]
              : [];
          })
        : [];

    const unique = new Map(
      [...publicPoints, ...stations].map(point => [
        point.name.toLocaleLowerCase("pt-BR") +
          "|" +
          point.lat +
          "|" +
          point.lng,
        point,
      ])
    );
    return [...unique.values()];
  }, [destinations, category, query, anpRows]);

  const plan = (destination: string) =>
    navigate(
      appUrl("/planejar") + "?destino=" + encodeURIComponent(destination) + "&auto=1"
    );

  const mapHeight = expandedMap
    ? "h-[min(76dvh,820px)] min-h-[460px]"
    : "h-[min(62dvh,620px)] min-h-[340px]";

  const emptyFallback = (
    <div
      className={
        "grid place-items-center rounded-2xl bg-[#17262d] p-6 text-center " +
        mapHeight
      }
    >
      <div>
        <MapPin className="mx-auto size-8 text-[#C7FF3C]" />
        <p className="mt-3 font-black">
          Destinos disponíveis neste aparelho
        </p>
        <p className="mt-2 max-w-sm text-sm text-white/70">
          O mapa de ruas precisa de conexão. Use o catálogo para preparar a
          viagem e mantenha as rotas importantes salvas para uso offline.
        </p>
      </div>
    </div>
  );

  const fallback = markers.length ? (
    <OfflineStationMap
      stations={markers}
      itemLabel="destino"
      heightClassName={mapHeight}
      onPlanDestination={item => plan(item.address)}
    />
  ) : (
    emptyFallback
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-32 pt-7 text-white sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#C7FF3C]">
            Atlas de Águas Lindas
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-[-.04em] sm:text-4xl">
            Mapa completo da cidade
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
            Um mapa vivo para reunir saúde, escolas, segurança, serviços,
            transporte, postos, comércio e referências locais. A base pode ser
            atualizada sem mudar o funcionamento principal do Trajeto.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={expandedMap}
          onClick={() => setExpandedMap(value => !value)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black"
        >
          {expandedMap ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
          {expandedMap ? "Mapa normal" : "Mapa grande"}
        </button>
      </div>

      {snapshot && (
        <section
          className="mt-5 grid gap-2 sm:grid-cols-3"
          aria-label="Perfil municipal do atlas"
        >
          <div className="rounded-2xl border border-white/10 bg-[#15212a] p-3">
            <p className="text-[11px] font-black uppercase tracking-[.12em] text-white/40">
              Município
            </p>
            <p className="mt-1 text-sm font-black">
              IBGE {snapshot.city.ibgeCode}
            </p>
            <p className="mt-1 text-xs text-white/55">
              {snapshot.city.areaKm2.toLocaleString("pt-BR", {
                maximumFractionDigits: 3,
              })}{" "}
              km²
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#15212a] p-3">
            <p className="text-[11px] font-black uppercase tracking-[.12em] text-white/40">
              População
            </p>
            <p className="mt-1 text-sm font-black">
              {snapshot.city.populationEstimate2026.toLocaleString("pt-BR")}{" "}
              estimada
            </p>
            <p className="mt-1 text-xs text-white/55">
              {snapshot.city.populationCensus2022.toLocaleString("pt-BR")} no
              Censo 2022
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#15212a] p-3">
            <p className="text-[11px] font-black uppercase tracking-[.12em] text-white/40">
              Base do mapa
            </p>
            <p className="mt-1 text-sm font-black">
              Atualizada em{" "}
              {new Date(snapshot.updatedAt + "T00:00:00Z").toLocaleDateString(
                "pt-BR",
                { timeZone: "UTC" }
              )}
            </p>
            <p className="mt-1 text-xs text-white/55">
              Dados versionados e cacheáveis para uso offline.
            </p>
          </div>
        </section>
      )}

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#15212a] px-4">
        <Search className="size-4 shrink-0 text-white/60" />
        <input
          aria-label="Buscar destino no mapa"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Escola, bairro, posto, hospital ou serviço"
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </div>

      <section className="mt-3" aria-labelledby="city-map-layers">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-white/45">
          <Layers3 className="size-4" />
          <h2 id="city-map-layers">Camadas do mapa</h2>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap">
          {CITY_ATLAS_LAYERS.map(layer => {
            const total =
              layer.id === "todos"
                ? atlas.length
                : counts[layer.id as CityAtlasLayer] ?? 0;
            return (
              <button
                key={layer.id}
                type="button"
                aria-label={layer.label}
                aria-pressed={category === layer.id}
                onClick={() => setCategory(layer.id)}
                className={
                  "min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold " +
                  (category === layer.id
                    ? "border-[#C7FF3C] bg-[#C7FF3C] text-[#102028]"
                    : "border-white/15 bg-white/5 text-white/80")
                }
              >
                {layer.label}
                {total > 0 && (
                  <span className="ml-1.5 text-xs opacity-65">{total}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={() => navigate(appUrl("/planejar"))}
          className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-black"
        >
          <Route className="size-4 shrink-0" />
          Planejar rota
        </button>
      </div>

      <section
        ref={mapSectionRef}
        aria-label="Mapa da cidade"
        className="mt-2 scroll-mt-3 overflow-hidden rounded-3xl border border-white/15 shadow-2xl"
      >
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 bg-[#10191f] px-3 py-2 text-xs">
          <span className="min-w-0 truncate font-bold text-white/70">
            {online ? "Mapa de ruas online" : "Mapa vetorial offline"}
          </span>
          <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 font-black text-[#C7FF3C]">
            {markers.length} pontos
          </span>
        </div>
        {online && markers.length ? (
          <TileStationMap
            stations={markers}
            heightClassName={mapHeight}
            selectionLabel="Escolher destino no mapa"
            onPlanDestination={item => plan(item.address)}
            fallback={fallback}
          />
        ) : (
          fallback
        )}
      </section>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/65">
        <span>
          {markers.length} posições no mapa · {destinations.length} itens na
          camada · {atlas.length} itens no atlas
        </span>
        <Link
          href={appUrl("/mapa/postos")}
          className="flex min-h-11 items-center rounded-xl border border-white/15 px-3 font-bold"
        >
          Mapa e consulta de postos
        </Link>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <p className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs leading-relaxed text-white/60">
          <ShieldCheck className="size-4 shrink-0 text-[#C7FF3C]" />
          O mapa não solicita sua localização. Pontos sem coordenada validada
          continuam pesquisáveis e podem ser planejados pelo endereço.
        </p>
        <p className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs leading-relaxed text-white/60">
          <Database className="size-4 shrink-0 text-[#3DE3FF]" />
          O atlas oficial é salvo pelo pacote offline e atualizado junto com as
          próximas versões do Trajeto.
        </p>
      </div>

      <section aria-labelledby="city-destinations" className="mt-6">
        <h2 id="city-destinations" className="text-lg font-black">
          Catálogo da cidade
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          Use a busca para localizar bairros, escolas e serviços mesmo quando
          ainda não houver um marcador com coordenada validada.
        </p>
        <div id="city-destination-grid" className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDestinations.map(item => {
            const action = item.destination ?? item.address;
            return action ? (
              <button
                key={item.id}
                type="button"
                onClick={() => plan(action)}
                className="flex min-h-24 items-start gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#182a33] to-[#10191f] p-4 text-left transition hover:border-[#C7FF3C]/50"
              >
                <MapPin className="mt-1 size-5 shrink-0 text-[#C7FF3C]" />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-black">
                    {item.name}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-white/65">
                    {item.detail}
                  </span>
                  {item.address && (
                    <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-white/40">
                      {item.address}
                    </span>
                  )}
                  <span className="mt-2 block text-xs font-bold text-[#C7FF3C]">
                    Planejar viagem →
                  </span>
                </span>
              </button>
            ) : (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-24 items-start gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#182a33] to-[#10191f] p-4 text-left transition hover:border-[#3DE3FF]/50"
              >
                <Database className="mt-1 size-5 shrink-0 text-[#3DE3FF]" />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-black">
                    {item.name}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-white/65">
                    {item.detail}
                  </span>
                  <span className="mt-2 block text-xs font-bold text-[#3DE3FF]">
                    Ver fonte oficial →
                  </span>
                </span>
              </a>
            );
          })}
        </div>
        {!destinations.length && (
          <p role="status" className="mt-3 text-sm text-white/70">
            Nenhum item encontrado. Tente outro nome, bairro ou camada.
          </p>
        )}
        {!query.trim() && hiddenDestinationCount > 0 && (
          <button
            type="button"
            aria-expanded={showAllCatalog}
            aria-controls="city-destination-grid"
            onClick={() => setShowAllCatalog(true)}
            className="mt-4 min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black text-white sm:w-auto"
          >
            Mostrar mais {hiddenDestinationCount} itens
          </button>
        )}
      </section>

      <details className="mt-6 rounded-2xl border border-white/10 p-4 text-xs text-white/65">
        <summary className="min-h-8 cursor-pointer font-bold">
          Fontes e proveniência do mapa
        </summary>
        <div className="mt-3 space-y-3">
          {snapshot?.sources.map(source => (
            <p key={source.id}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {source.label}
              </a>
            </p>
          ))}
          {LOCAL_GEOCODE_POINTS.map(point => (
            <p key={point.id}>
              <a
                href={point.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {point.name} · {point.sourceLabel}
              </a>
            </p>
          ))}
        </div>
        <p className="mt-3">
          Postos: cadastro local conciliado com a ANP. Ruas: pacote vetorial
          local baseado em OpenStreetMap. Dados sem coordenada permanecem no
          catálogo até a posição ser validada.
        </p>
      </details>
    </main>
  );
}
