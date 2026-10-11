import { distanceKm, type OfflinePoint } from "./offlineRouteMath";

/**
 * Haversine distance is more expensive than a numeric comparison. Compute
 * it once per station, not once per comparison during O(n log n) sorting.
 * Never reorder or mutate the caller's catalogue or its station objects.
 */
export function sortStationsByDistance<T extends OfflinePoint>(
  stations: readonly T[],
  origin: OfflinePoint,
): T[] {
  return stations
    .map(station => ({ station, distance: distanceKm(origin, station) }))
    .sort((a, b) => a.distance - b.distance)
    .map(entry => entry.station);
}
