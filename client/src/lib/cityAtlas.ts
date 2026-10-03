import cityAtlasData from "../../public/data/aguas-lindas-city-atlas.json";
import offlineMapData from "../../public/data/aguas-lindas-offline-map.json";
import { appUrl } from "@/lib/appUrl";
import { normalizeCatalogText } from "@/lib/catalogSearch";
import { ALL_LOCAL_ROUTE_DESTINATIONS } from "@/lib/localRoutePresets";
import { PUBLIC_SERVICES } from "@/lib/publicServices";

export type CityAtlasLayer =
  | "saude"
  | "educacao"
  | "seguranca"
  | "servicos"
  | "transporte"
  | "combustivel"
  | "compras"
  | "alimentacao"
  | "meio-ambiente"
  | "referencia";

export type CityAtlasItem = {
  id: string;
  name: string;
  detail: string;
  category: CityAtlasLayer;
  address?: string;
  destination?: string;
  sourceLabel: string;
  sourceUrl?: string;
  verifiedAt?: string;
  keywords?: string[];
  lat?: number;
  lng?: number;
  coordinateKind?: "mapped-point" | "street-midpoint" | "area-reference";
  coordinateLabel?: string;
  business?: { cnpj: string; legalName: string; tradeName: string; sector: string; cnae: string; opened: string; statusDate: string; size: string; mei: string; simples: string; nature: string };
  coordinateSourceId?: string;
  coordinateVerifiedAt?: string;
};

export type CityAtlasSnapshot = {
  schema: 1;
  updatedAt: string;
  city: {
    name: string;
    state: string;
    ibgeCode: string;
    areaKm2: number;
    populationCensus2022: number;
    populationEstimate2026: number;
    profileSourceId: string;
  };
  sources: Array<{ id: string; label: string; url: string }>;
  items: Array<{
    id: string;
    name: string;
    detail: string;
    category: CityAtlasLayer;
    address?: string;
    destination?: string;
    sourceId: string;
    verifiedAt?: string;
    keywords?: string[];
    lat?: number;
    lng?: number;
    coordinateKind?: "mapped-point" | "street-midpoint";
    coordinateSourceId?: string;
    coordinateVerifiedAt?: string;
  }>;
};

export const CITY_ATLAS_LAYERS: Array<{
  id: "todos" | CityAtlasLayer;
  label: string;
}> = [
  { id: "todos", label: "Tudo" },
  { id: "saude", label: "Saúde" },
  { id: "educacao", label: "Educação" },
  { id: "seguranca", label: "Segurança" },
  { id: "servicos", label: "Serviços" },
  { id: "transporte", label: "Transporte" },
  { id: "combustivel", label: "Postos" },
  { id: "compras", label: "Compras" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "meio-ambiente", label: "Meio ambiente" },
  { id: "referencia", label: "Referências" },
];

const publicCategory = new Map(
  PUBLIC_SERVICES.map(service => [
    service.id,
    service.category === "saude"
      ? "saude"
      : service.category === "seguranca"
        ? "seguranca"
        : service.category === "educacao"
          ? "educacao"
          : service.category === "transito"
            ? "transporte"
            : "servicos",
  ] as const)
);

function categoryForRoute(item: (typeof ALL_LOCAL_ROUTE_DESTINATIONS)[number]): CityAtlasLayer {
  const fromPublic = publicCategory.get(item.id);
  if (fromPublic) return fromPublic;

  const text = normalizeCatalogText(item.label + " " + item.detail);
  if (/\b(escola|colegio|cepi|educacao)\b/.test(text)) return "educacao";
  if (/\b(policia|delegacia|bombeiro|seguranca)\b/.test(text)) return "seguranca";
  if (item.category === "saude") return "saude";
  if (item.category === "transporte") return "transporte";
  if (item.category === "combustivel") return "combustivel";
  if (item.category === "compras") return "compras";
  if (item.category === "alimentacao") return "alimentacao";
  if (item.category === "centro") return "referencia";
  return "servicos";
}

type BundledOfflineRoad = { id: number; kind: string; name: string; points: number[][] };

function offlineRoadReferenceItems(): CityAtlasItem[] {
  const roads = ((offlineMapData as { roads?: BundledOfflineRoad[] }).roads ?? []).filter(road => road.name.trim() && road.points.length > 0);
  // Join only connected OSM segments of the same name. A shared street
  // name is not evidence that two disconnected locations are the same road.
  const parents = roads.map((_, index) => index);
  const root = (index: number): number => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]];
      index = parents[index];
    }
    return index;
  };
  const vertices = new Map<string, number>();
  roads.forEach((road, index) => {
    for (const point of road.points) {
      const key = normalizeCatalogText(road.name) + "|" + point.join(",");
      const previous = vertices.get(key);
      if (previous !== undefined) parents[root(index)] = root(previous);
      else vertices.set(key, index);
    }
  });
  const components = new Map<number, BundledOfflineRoad>();
  roads.forEach((road, index) => {
    const key = root(index);
    const current = components.get(key);
    if (!current || road.points.length > current.points.length) components.set(key, road);
  });
  return [...components.values()].flatMap(road => {
    const point = road.points[Math.floor((road.points.length - 1) / 2)];
    if (!Array.isArray(point) || point.length < 2 || !finiteCoordinate(point[0], 90) || !finiteCoordinate(point[1], 180)) return [];
    return [{
      id: "offline-road-" + road.id,
      name: road.name.trim(),
      detail: "Via presente no mapa offline local · ponto central aproximado do trecho mapeado",
      category: "referencia" as const,
      address: road.name.trim() + ", Águas Lindas de Goiás - GO",
      destination: road.name.trim() + ", Águas Lindas de Goiás - GO",
      sourceLabel: "OpenStreetMap · referência aproximada do mapa offline",
      sourceUrl: "https://www.openstreetmap.org/way/" + road.id,
      verifiedAt: offlineMapData.retrievedAt,
      coordinateVerifiedAt: offlineMapData.retrievedAt,
      keywords: ["rua", "avenida", "via", "logradouro", road.kind].filter(Boolean),
      lat: point[0],
      lng: point[1],
      coordinateKind: "street-midpoint" as const,
      coordinateLabel: "Centro aproximado da via no mapa offline",
    }];
  });
}

const OFFLINE_ROAD_ITEMS = offlineRoadReferenceItems();

const BASE_ITEMS: CityAtlasItem[] = ALL_LOCAL_ROUTE_DESTINATIONS.map(item => ({
  id: "catalog-" + item.id,
  name: item.label,
  detail: item.detail,
  category: categoryForRoute(item),
  address: item.destination,
  destination: item.destination,
  sourceLabel: "Catálogo local consolidado do Trajeto",
  keywords: [item.category],
}));

function isLayer(value: unknown): value is CityAtlasLayer {
  return CITY_ATLAS_LAYERS.some(layer => layer.id !== "todos" && layer.id === value);
}

function finiteCoordinate(value: unknown, limit: number) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

export function normalizeCityAtlasSnapshot(value: unknown): CityAtlasSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.schema !== 1 || typeof input.updatedAt !== "string" || !Number.isFinite(Date.parse(input.updatedAt))) return null;
  if (!input.city || typeof input.city !== "object" || Array.isArray(input.city)) return null;
  const city = input.city as Record<string, unknown>;
  if (
    typeof city.name !== "string" ||
    typeof city.state !== "string" ||
    typeof city.ibgeCode !== "string" ||
    typeof city.areaKm2 !== "number" ||
    typeof city.populationCensus2022 !== "number" ||
    typeof city.populationEstimate2026 !== "number" ||
    typeof city.profileSourceId !== "string"
  ) return null;
  if (!Array.isArray(input.sources) || !Array.isArray(input.items) || input.items.length > 5000) return null;

  const sources = input.sources.flatMap(source => {
    if (!source || typeof source !== "object" || Array.isArray(source)) return [];
    const item = source as Record<string, unknown>;
    return typeof item.id === "string" && typeof item.label === "string" && typeof item.url === "string"
      ? [{ id: item.id, label: item.label, url: item.url }]
      : [];
  });
  const sourceMap = new Map(sources.map(source => [source.id, source]));
  if (
    sourceMap.size !== sources.length ||
    !sourceMap.has(city.profileSourceId)
  ) return null;

  const itemIds = input.items.flatMap(raw =>
    raw && typeof raw === "object" && !Array.isArray(raw) &&
    typeof (raw as Record<string, unknown>).id === "string"
      ? [(raw as Record<string, unknown>).id as string]
      : []
  );
  if (new Set(itemIds).size !== itemIds.length) return null;

  const items = input.items.flatMap(raw => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.detail !== "string" ||
      !isLayer(item.category) ||
      typeof item.sourceId !== "string" ||
      !sourceMap.has(item.sourceId) ||
      (item.verifiedAt !== undefined &&
        (typeof item.verifiedAt !== "string" ||
          !Number.isFinite(Date.parse(item.verifiedAt))))
    ) return [];
    const hasLat = item.lat !== undefined;
    const hasLng = item.lng !== undefined;
    if (hasLat !== hasLng) return [];
    if (hasLat && (!finiteCoordinate(item.lat, 90) || !finiteCoordinate(item.lng, 180))) return [];
    if (hasLat && (
      typeof item.coordinateSourceId !== "string" ||
      !sourceMap.has(item.coordinateSourceId) ||
      typeof item.coordinateVerifiedAt !== "string" ||
      !Number.isFinite(Date.parse(item.coordinateVerifiedAt))
    )) return [];
    if (item.coordinateKind !== undefined && !["mapped-point", "street-midpoint"].includes(String(item.coordinateKind))) return [];
    return [{
      id: item.id,
      name: item.name,
      detail: item.detail,
      category: item.category,
      address: typeof item.address === "string" ? item.address : undefined,
      destination: typeof item.destination === "string" ? item.destination : undefined,
      sourceId: item.sourceId,
      verifiedAt: typeof item.verifiedAt === "string" ? item.verifiedAt : undefined,
      keywords: Array.isArray(item.keywords) ? item.keywords.filter((keyword): keyword is string => typeof keyword === "string").slice(0, 20) : undefined,
      lat: typeof item.lat === "number" ? item.lat : undefined,
      lng: typeof item.lng === "number" ? item.lng : undefined,
      coordinateKind: item.coordinateKind as "mapped-point" | "street-midpoint" | undefined,
      coordinateSourceId: typeof item.coordinateSourceId === "string" ? item.coordinateSourceId : undefined,
      coordinateVerifiedAt: typeof item.coordinateVerifiedAt === "string" ? item.coordinateVerifiedAt : undefined,
    }];
  });

  return {
    schema: 1,
    updatedAt: input.updatedAt,
    city: city as CityAtlasSnapshot["city"],
    sources,
    items,
  };
}

export const BUNDLED_CITY_ATLAS = normalizeCityAtlasSnapshot(cityAtlasData);

export async function loadCityAtlasSnapshot(): Promise<CityAtlasSnapshot | null> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return BUNDLED_CITY_ATLAS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(appUrl("/data/aguas-lindas-city-atlas.json"), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return BUNDLED_CITY_ATLAS;
    return normalizeCityAtlasSnapshot(await response.json()) ?? BUNDLED_CITY_ATLAS;
  } catch {
    return BUNDLED_CITY_ATLAS;
  } finally {
    clearTimeout(timer);
  }
}

function supplementalItems(snapshot: CityAtlasSnapshot | null): CityAtlasItem[] {
  if (!snapshot) return [];
  const sources = new Map(snapshot.sources.map(source => [source.id, source]));
  return snapshot.items.map(item => {
    const source = sources.get(item.sourceId);
    return {
      id: "atlas-" + item.id,
      name: item.name,
      detail: item.detail,
      category: item.category,
      address: item.address,
      destination: item.destination,
      sourceLabel: source?.label ?? "Fonte oficial",
      sourceUrl: source?.url,
      verifiedAt: item.verifiedAt,
      keywords: item.keywords,
      lat: item.lat,
      lng: item.lng,
      coordinateKind: item.coordinateKind,
      coordinateSourceId: item.coordinateSourceId,
      coordinateVerifiedAt: item.coordinateVerifiedAt,
    };
  });
}

function identity(item: CityAtlasItem) {
  if (item.coordinateKind === "street-midpoint") {
    return normalizeCatalogText(item.name) + "|" + item.lat + "|" + item.lng;
  }
  return normalizeCatalogText(item.name)
    .replace(/\b(escola municipal|colegio estadual|colegio|escola|creche municipal|creche)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCityAtlas(snapshot: CityAtlasSnapshot | null) {
  const merged = new Map<string, CityAtlasItem>();
  for (const item of BASE_ITEMS) merged.set(identity(item) || item.id, item);
  // The versioned atlas contains source/date metadata and therefore replaces
  // a matching legacy shortcut instead of duplicating it.
  for (const item of supplementalItems(snapshot)) merged.set(identity(item) || item.id, item);

  // The offline map has more named roads than the searchable atlas snapshot.
  // Keep connected street references and sourced points at distinct positions;
  // homonymous streets must stay selectable instead of being merged by name.
  for (const item of OFFLINE_ROAD_ITEMS) {
    // Preserve the sourced reference at the same name and position, while
    // retaining disconnected same-name streets as explicit alternatives.
    const key = identity(item) || item.id;
    if (!merged.has(key)) merged.set(key, item);
  }
  return [...merged.values()];
}

export function resolveCityAtlasPoint(
  snapshot: CityAtlasSnapshot | null,
  value: string,
): { lat: number; lng: number } | null {
  const query = normalizeCatalogText(value);
  if (!query) return null;

  const candidates = buildCityAtlas(snapshot).filter(item => {
    if (!finiteCoordinate(item.lat, 90) || !finiteCoordinate(item.lng, 180)) return false;
    const fields = [item.name, item.address, item.destination]
      .filter((field): field is string => Boolean(field))
      .map(normalizeCatalogText);
    // A street midpoint cannot locate a specific house, quadra or lote.
    if (item.coordinateKind === "street-midpoint" || item.sourceLabel.includes("referência aproximada")) {
      return fields.some(field => field === query);
    }
    return fields.some(field =>
      field === query ||
      field.includes(query) ||
      query.includes(field)
    );
  });

  const exactMatches = candidates.filter(item =>
    [item.name, item.address, item.destination]
      .filter((field): field is string => Boolean(field))
      .some(field => normalizeCatalogText(field) === query)
  );
  const match = exactMatches.length === 1 ? exactMatches[0] :
    exactMatches.length === 0 && candidates.length === 1 ? candidates[0] : null;
  return match && typeof match.lat === "number" && typeof match.lng === "number"
    ? { lat: match.lat, lng: match.lng }
    : null;
}

const searchIndex = new WeakMap<CityAtlasItem, string>();

export function filterCityAtlas(
  items: CityAtlasItem[],
  query: string,
  category: "todos" | CityAtlasLayer,
) {
  const terms = normalizeCatalogText(query).split(" ").filter(Boolean);
  return items.filter(item => {
    if (category !== "todos" && item.category !== category) return false;
    if (!terms.length) return true;
    let text = searchIndex.get(item);
    if (text === undefined) {
      text = normalizeCatalogText([item.name, item.detail, item.address, item.destination, item.category, ...(item.keywords ?? [])].filter(Boolean).join(" "));
      searchIndex.set(item, text);
    }
    return terms.every(term => text.includes(term));
  });
}

export function cityAtlasCounts(items: CityAtlasItem[]) {
  const counts: Partial<Record<CityAtlasLayer, number>> = {};
  for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}


export type AtlasDestinationReference = {
  name: string;
  sourceLabel: string;
  precision: string;
};

// Recover public street provenance from its exact catalog coordinate, including
// routes reopened offline. Never infer a house or entrance from nearby points.
let bundledStreetReferences: CityAtlasItem[] | undefined;
function getBundledStreetReferences() {
  return bundledStreetReferences ??= buildCityAtlas(BUNDLED_CITY_ATLAS).filter(item => item.coordinateKind === "street-midpoint");
}

export function atlasDestinationReference(point: { lat: number; lng: number }): AtlasDestinationReference | undefined {
  const item = getBundledStreetReferences().find(item =>
    item.coordinateKind === "street-midpoint" && item.lat === point.lat && item.lng === point.lng
  );
  return item ? {
    name: item.name,
    sourceLabel: item.sourceLabel,
    precision: "Centro aproximado do trecho; não identifica uma casa ou entrada.",
  } : undefined;
}


export function isAmbiguousAtlasStreet(value: string) {
  const query = normalizeCatalogText(value);
  if (!query) return false;
  const positions = new Set(getBundledStreetReferences()
    .filter(item => item.coordinateKind === "street-midpoint" &&
      [item.name, item.address, item.destination].some(field => field && normalizeCatalogText(field) === query))
    .map(item => item.lat + "," + item.lng));
  return positions.size > 1;
}
