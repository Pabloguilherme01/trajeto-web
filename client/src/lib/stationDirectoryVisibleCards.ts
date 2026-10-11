import { distanceKm } from "./offlineRouteMath";
import { stationCoordinatePoint } from "./stationListControls";

type StationCardSource = {
  key: string;
  local?: { anp?: { latitude?: number | null; longitude?: number | null } | null } | null;
  anp?: { latitude?: number | null; longitude?: number | null } | null;
};

/**
 * Compute only the cards mounted on screen. Coordinates, distances and
 * favorite membership are stable between unrelated page interactions.
 * Keep the original null-coordinate fallback and original card identities.
 */
export function prepareVisibleStationDirectoryCards<T extends StationCardSource>(
  filtered: readonly T[],
  visibleCount: number,
  origin: { lat: number; lng: number } | null,
  savedPlaceIds: ReadonlySet<string>,
) {
  return filtered.slice(0, visibleCount).map((item, position) => {
    const point = stationCoordinatePoint(
      item.anp?.latitude ?? item.local?.anp?.latitude,
      item.anp?.longitude ?? item.local?.anp?.longitude,
    );
    return {
      item,
      index: position + 1,
      saved: savedPlaceIds.has("aguas-lindas:" + item.key),
      point,
      distance: origin && point ? distanceKm(origin, point) : null,
    };
  });
}
