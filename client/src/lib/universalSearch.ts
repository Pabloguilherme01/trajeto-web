import { searchAguasLindasStations } from "./aguasLindasStations";
import { normalizeCatalogText } from "./catalogSearch";
import { getLocalRoutePresets } from "./localRoutePresets";
import { searchLocalPlaces } from "./localPlaces";
import { searchPublicServices } from "./publicServices";
import { searchPublicDataResources, searchSemiurbanFares } from "./publicDataHub";

const serviceAliases: Record<string, string> = {
  upa: "upa-mansoes-odisseia",
  "policia-civil": "policia-civil-1",
  "drp-17": "pcgo-17-drp",
  transito: "transito-mobilidade",
  "cora-coralina": "coralina",
  "cepi-jk": "cepi-juscelino",
  "cepm-aguas-lindas": "pm-go-aguas-lindas",
};

export function getUniversalSearchResults(query: string) {
  const value = query.trim();
  if (!value)
    return { services: [], stations: [], places: [], routes: [], dataResources: [], transitFares: [], total: 0 };
  const services = searchPublicServices(value);
  const stations = searchAguasLindasStations(value);
  const places = searchLocalPlaces(value);
  const serviceCategories = new Set<string>(services.map(item => item.category));
  const normalizedQuery = normalizeCatalogText(value);
  const dataResources = searchPublicDataResources(value).filter(item => {
    if (!serviceCategories.has(item.category)) return true;
    // Numeric/road identifiers such as BR-070 are specific enough to keep
    // official datasets even when a service from the same broad category also matches.
    if (
      /\d/.test(normalizedQuery) &&
      normalizeCatalogText(item.keywords.join(" ")).includes(normalizedQuery)
    )
      return true;
    return [item.id, item.title, item.sourceLabel].some(field => {
      const normalizedField = normalizeCatalogText(field);
      return (
        normalizedField.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedField)
      );
    });
  });
  const transitFares = searchSemiurbanFares(value);
  const serviceIds = new Set(services.map(item => item.id));
  const placeIds = new Set(places.flatMap(item => [item.id, "place-" + item.id]));
  const destinations = new Set(
    [
      ...services.map(item => item.mapQuery),
      ...places.map(item => item.mapQuery),
    ]
      .filter((item): item is string => Boolean(item))
      .map(normalizeCatalogText)
  );
  // Service cards already open contacts and routes; avoid repeating destinations.
  const routes = getLocalRoutePresets(value).filter(
    item =>
      !serviceIds.has(serviceAliases[item.id] ?? item.id) &&
      !placeIds.has(item.id) &&
      !destinations.has(normalizeCatalogText(item.destination))
  );
  return {
    services,
    stations,
    places,
    routes,
    dataResources,
    transitFares,
    total:
      services.length +
      stations.length +
      places.length +
      routes.length +
      dataResources.length +
      transitFares.length,
  };
}
