import { searchAguasLindasStations } from "./aguasLindasStations";
import { normalizeCatalogText } from "./catalogSearch";
import { getLocalRoutePresets } from "./localRoutePresets";
import { searchLocalPlaces } from "./localPlaces";
import { searchPublicServices } from "./publicServices";

const serviceAliases: Record<string, string> = {
  upa: "upa-mansoes-odisseia",
  "policia-civil": "policia-civil-1",
  "drp-17": "pcgo-17-drp",
  transito: "transito-mobilidade",
  "cora-coralina": "coralina",
  "cepi-jk": "cepi-juscelino",
  "cepm-aguas-lindas": "pm-go-aguas-lindas",
};

function relevanceScore(query: string, values: Array<string | null | undefined>) {
  const needle = normalizeCatalogText(query);
  if (!needle) return 0;
  const terms = needle.split(" ").filter(Boolean);
  let best = 0;
  for (const raw of values) {
    if (!raw) continue;
    const value = normalizeCatalogText(raw);
    if (!value) continue;
    if (value === needle) best = Math.max(best, 120);
    else if (value.startsWith(needle)) best = Math.max(best, 100);
    else if (value.includes(needle)) best = Math.max(best, 80);
    if (terms.length > 1 && terms.every(term => value.includes(term))) {
      best = Math.max(best, 60 + terms.filter(term => value.startsWith(term)).length * 5);
    } else if (terms.some(term => value.startsWith(term))) {
      best = Math.max(best, 45);
    } else if (terms.some(term => value.includes(term))) {
      best = Math.max(best, 30);
    }
  }
  return best;
}

function rankByRelevance<T>(
  items: T[],
  query: string,
  values: (item: T) => Array<string | null | undefined>
) {
  return items
    .map((item, index) => ({
      item,
      index,
      score: relevanceScore(query, values(item)),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.item);
}

export function getUniversalSearchResults(query: string) {
  const value = query.trim();
  if (!value)
    return { services: [], stations: [], places: [], routes: [], total: 0 };
  const services = rankByRelevance(searchPublicServices(value), value, item => [
    item.name,
    ...(item.keywords ?? []),
    item.description,
    item.address,
    item.guidance,
    item.actionLabel,
  ]);
  const stations = rankByRelevance(searchAguasLindasStations(value), value, item => [
    item.displayName,
    item.address,
    item.neighborhood,
  ]);
  const places = rankByRelevance(searchLocalPlaces(value), value, item => [
    item.name,
    item.detail,
    item.address,
    item.category,
  ]);
  const serviceIds = new Set(services.map(item => item.id));
  const placeIds = new Set(places.map(item => "place-" + item.id));
  const destinations = new Set(
    [
      ...services.map(item => item.mapQuery),
      ...places.map(item => item.mapQuery),
    ]
      .filter((item): item is string => Boolean(item))
      .map(normalizeCatalogText)
  );
  // Service cards already open contacts and routes; avoid repeating destinations.
  const routes = rankByRelevance(
    getLocalRoutePresets(value).filter(
      item =>
        !serviceIds.has(serviceAliases[item.id] ?? item.id) &&
        !placeIds.has(item.id) &&
        !destinations.has(normalizeCatalogText(item.destination))
    ),
    value,
    item => [item.label, item.detail, item.destination, item.category]
  );
  return {
    services,
    stations,
    places,
    routes,
    total: services.length + stations.length + places.length + routes.length,
  };
}
