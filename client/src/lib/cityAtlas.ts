import { appUrl } from "@/lib/appUrl";
import { matchesCatalogText, normalizeCatalogText } from "@/lib/catalogSearch";
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

  const seenItemIds = new Set<string>();
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
      seenItemIds.has(item.id) ||
      (item.verifiedAt !== undefined &&
        (typeof item.verifiedAt !== "string" ||
          !Number.isFinite(Date.parse(item.verifiedAt))))
    ) return [];
    seenItemIds.add(item.id);
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

export async function loadCityAtlasSnapshot(): Promise<CityAtlasSnapshot | null> {
  try {
    const response = await fetch(appUrl("/data/aguas-lindas-city-atlas.json"), {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return normalizeCityAtlasSnapshot(await response.json());
  } catch {
    return null;
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
    };
  });
}

function identity(item: CityAtlasItem) {
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
  return [...merged.values()];
}

export function filterCityAtlas(
  items: CityAtlasItem[],
  query: string,
  category: "todos" | CityAtlasLayer,
) {
  return items.filter(item =>
    (category === "todos" || item.category === category) &&
    matchesCatalogText(query, [
      item.name,
      item.detail,
      item.address,
      item.destination,
      item.category,
      ...(item.keywords ?? []),
    ])
  );
}

export function cityAtlasCounts(items: CityAtlasItem[]) {
  const counts: Partial<Record<CityAtlasLayer, number>> = {};
  for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}
