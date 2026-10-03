import type { LocalRoutePreset, ReadyCityRoute } from "@/lib/localRoutePresets";
import type { MobileDestination } from "@/lib/mobileDestinations";
import type { MobileStation } from "@/lib/mobileStationStore";

export type UnifiedDestinationKind = "place" | "station" | "personal" | "route";

export type UnifiedDestination = {
  id: string;
  kind: UnifiedDestinationKind;
  name: string;
  address: string;
  detail?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  source?: string | null;
  routeOrigin?: string | null;
};

export function routePresetDestination(item: LocalRoutePreset): UnifiedDestination {
  return {
    id: "place:" + item.id,
    kind: "place",
    name: item.label,
    address: item.destination,
    detail: item.detail,
    source: "catalog",
  };
}

export function mobileStationDestination(station: MobileStation): UnifiedDestination {
  return {
    id: "station:" + station.placeId,
    kind: "station",
    name: station.name,
    address: station.address,
    coordinates: { lat: station.lat, lng: station.lng },
    source: "station-favorite",
  };
}

export function personalDestination(item: MobileDestination): UnifiedDestination {
  return {
    id: "personal:" + item.id,
    kind: "personal",
    name: item.label,
    address: item.value,
    source: "personal",
  };
}

export function readyRouteDestination(route: ReadyCityRoute): UnifiedDestination {
  return {
    id: "route:" + route.id,
    kind: "route",
    name: route.label,
    address: route.destination,
    detail: route.detail,
    source: "ready-route",
    routeOrigin: route.origin,
  };
}

export function destinationNavigationValue(destination: UnifiedDestination) {
  const point = destination.coordinates;
  return point ? point.lat + "," + point.lng : destination.address;
}
