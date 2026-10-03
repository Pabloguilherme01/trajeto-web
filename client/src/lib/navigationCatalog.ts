import { ALL_LOCAL_ROUTE_DESTINATIONS, type LocalRoutePreset } from "@/lib/localRoutePresets";
import { matchesCatalogText, normalizeCatalogText } from "@/lib/catalogSearch";

export type NavigationDestination = {
  id: string;
  label: string;
  detail: string;
  destination: string;
  category: LocalRoutePreset["category"];
  source: "catalog" | "station";
  lat?: number;
  lng?: number;
  cnpj?: string | null;
};

function destinationKey(value: Pick<NavigationDestination, "destination" | "label">) {
  return normalizeCatalogText(value.destination || value.label);
}

export const NAVIGATION_DESTINATIONS: NavigationDestination[] = (() => {
  const seen = new Set<string>();
  return ALL_LOCAL_ROUTE_DESTINATIONS.flatMap(item => {
    const destination: NavigationDestination = {
      id: "catalog:" + item.id,
      label: item.label,
      detail: item.detail,
      destination: item.destination,
      category: item.category,
      source: "catalog",
    };
    const key = destinationKey(destination);
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [destination];
  });
})();

export function searchNavigationDestinations(query = "", limit = 12) {
  const results = NAVIGATION_DESTINATIONS.filter(item =>
    matchesCatalogText(query, [item.label, item.detail, item.destination, item.category])
  );
  return results.slice(0, Math.max(1, limit));
}

export function stationNavigationDestination(station: {
  id?: string;
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  cnpj?: string | null;
}): NavigationDestination {
  const hasCoordinates = Number.isFinite(station.lat) && Number.isFinite(station.lng);
  return {
    id: "station:" + (station.cnpj?.trim() || station.id || normalizeCatalogText(station.name)),
    label: station.name,
    detail: station.address || "Posto em Águas Lindas de Goiás",
    destination: hasCoordinates
      ? String(station.lat) + "," + String(station.lng)
      : [station.name, station.address].filter(Boolean).join(", "),
    category: "combustivel",
    source: "station",
    ...(hasCoordinates ? { lat: Number(station.lat), lng: Number(station.lng) } : {}),
    cnpj: station.cnpj ?? null,
  };
}
