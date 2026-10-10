import type { StationMapItem } from "@/components/StationMap";

/**
 * One stable identity policy for local and tiled map points.
 * Never collapse distinct CNPJs that share a mapped coordinate.
 */
export function stationMapKey(station: StationMapItem): string {
  return station.id ??
    station.cnpj ??
    station.placeId ??
    `${station.name}|${station.lat}|${station.lng}`;
}
