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
  const dataResources = searchPublicDataResources(value).filter(
    item => !serviceCategories.has(item.category)
  );
  const transitFares = searchSemiurbanFares(value);
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
