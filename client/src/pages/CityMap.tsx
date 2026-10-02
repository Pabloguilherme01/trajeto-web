import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, Search, ShieldCheck } from "lucide-react";
import TileStationMap from "@/components/TileStationMap";
import {
  LOCAL_GEOCODE_POINTS,
  resolveLocalGeocodePoint,
} from "@/lib/localGeocoding";
import { ALL_LOCAL_ROUTE_DESTINATIONS } from "@/lib/localRoutePresets";
import {
  groupAnpFuelRows,
  normalizeAnpFuelRow,
  type AnpFuelRow,
} from "@shared/anpRevendedores";
import { getOfflineAnpSnapshot } from "@/lib/stationMapOffline";
import { appUrl } from "@/lib/appUrl";
import { matchesCatalogText } from "@/lib/catalogSearch";

export default function CityMap() {
  const [, navigate] = useLocation();
  const [anpRows, setAnpRows] = useState(() => getOfflineAnpSnapshot().rows);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(appUrl("/data/aguas-lindas-anp.json"), {
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error("snapshot");
        return response.json();
      })
      .then((payload: { data?: unknown[] }) => {
        if (controller.signal.aborted) return;
        const rows = (Array.isArray(payload.data) ? payload.data : [])
          .map(item =>
            item && typeof item === "object"
              ? normalizeAnpFuelRow(item as Record<string, unknown>)
              : null
          )
          .filter((row): row is AnpFuelRow => Boolean(row));
        if (rows.length) setAnpRows(rows);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todos");
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
    () =>
      ALL_LOCAL_ROUTE_DESTINATIONS.filter(
        item =>
          (category === "todos" || item.category === category) &&
          matchesCatalogText(query, [item.label, item.detail, item.destination])
      ),
    [query, category]
  );
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
    const stations =
      category === "todos" || category === "combustivel"
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
      appUrl("/planejar") + "?destino=" + encodeURIComponent(destination)
    );
  const fallback = (
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
      </div>
      <div
        className="my-3 flex flex-wrap gap-2"
        aria-label="Categorias do mapa"
      >
        {[
          ["todos", "Tudo"],
          ["saude", "Saúde"],
          ["servicos", "Serviços"],
          ["compras", "Compras"],
          ["transporte", "Transporte"],
          ["combustivel", "Postos"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
            className={
              "min-h-11 rounded-full border px-4 text-sm font-bold " +
              (category === value
                ? "border-[#C7FF3C] bg-[#C7FF3C] text-[#102028]"
                : "border-white/15 bg-white/5 text-white/80")
            }
          >
            {label}
          </button>
        ))}
      </div>
      <section
        aria-label="Mapa da cidade"
        className="overflow-hidden rounded-3xl border border-white/15 shadow-2xl"
      >
        {online && markers.length ? (
          <TileStationMap
            stations={markers}
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
          {markers.length} posições cadastradas · {destinations.length} destinos
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
            <button
              key={item.id}
              type="button"
              onClick={() => plan(item.destination)}
              className="flex min-h-24 items-start gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#182a33] to-[#10191f] p-4 text-left transition hover:border-[#C7FF3C]/50"
            >
              <MapPin className="mt-1 size-5 shrink-0 text-[#C7FF3C]" />
              <span className="min-w-0">
                <span className="block break-words text-sm font-black">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-white/65">
                  {item.detail}
                </span>
                <span className="mt-2 block text-xs font-bold text-[#C7FF3C]">
                  Planejar viagem →
                </span>
              </span>
            </button>
          ))}
        </div>
        {!destinations.length && (
          <p role="status" className="mt-3 text-sm text-white/70">
            Nenhum destino encontrado. Tente outro nome ou categoria.
          </p>
        )}
      </section>
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
