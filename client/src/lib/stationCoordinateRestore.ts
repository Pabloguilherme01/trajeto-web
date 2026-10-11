import type { StationMapItem } from "@/components/StationMap";

type CachedPoint = { lat: number; lng: number; source: "local" };

/**
 * Preserve already verified positions without touching synchronous storage.
 * Only records missing a valid point require an offline-cache lookup.
 * Keep original order and object identity whenever a location is already known.
 */
export function restoreStationCoordinates(
  stations: readonly StationMapItem[],
  readCached: (station: StationMapItem) => CachedPoint | null,
): StationMapItem[] {
  return stations.map(station => {
    if (
      typeof station.lat === "number" && Number.isFinite(station.lat) &&
      typeof station.lng === "number" && Number.isFinite(station.lng)
    ) return station;
    const cached = readCached(station);
    return cached ? { ...station, ...cached } : station;
  });
}
