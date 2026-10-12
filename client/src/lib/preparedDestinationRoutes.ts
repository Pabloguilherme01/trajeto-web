import { findBestOfflineRouteForTrip, type OfflineRoute } from "./offlineStore";
import type { LocalRoutePreset } from "./localRoutePresets";
import type { PublicTravelMode } from "./publicRouting";

function hasSavedRoadGeometry(route: OfflineRoute) {
  const payload = route.payload;
  if (!payload || typeof payload !== "object" || !("route" in payload)) return false;
  const details = payload.route;
  if (!details || typeof details !== "object" || !("source" in details) || !("polyline" in details)) return false;
  return (details.source === "osrm" || details.source === "mapbox" || details.source === "offline-road") &&
    typeof details.polyline === "string" && details.polyline.length > 0;
}

/** Only routes actually saved on this device for the named origin and mode. */
export function filterPreparedDestinations(items: readonly LocalRoutePreset[], savedRoutes: readonly OfflineRoute[],
  origin: string, mode: PublicTravelMode): LocalRoutePreset[] {
  if (origin.trim().length < 3 || savedRoutes.length === 0) return [];
  return items.filter(item => {
    const match = findBestOfflineRouteForTrip([...savedRoutes], origin, item.destination, mode);
    return match !== null && hasSavedRoadGeometry(match);
  });
}
