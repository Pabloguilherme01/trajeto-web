import { resolveLocalGeocodePoint } from "./localGeocoding";
import { resolveReadyRouteStreetPoint } from "./localRoutePresets";
import { resolveCityAtlasPoint, type CityAtlasSnapshot } from "./cityAtlas";
import { isAguasLindasRoutePoint, type MapPoint } from "./mapGeometry";

/** Public catalog coordinates only: no GPS, provider cache or network access. */
export function createDestinationPointResolver(snapshot: CityAtlasSnapshot | null) {
  const points = new Map<string, MapPoint | null>();
  return (destination: string): MapPoint | null => {
    if (points.has(destination)) return points.get(destination)!;
    const candidates = [
      resolveReadyRouteStreetPoint(destination),
      resolveLocalGeocodePoint(destination),
    ];
    let point = candidates.find(isAguasLindasRoutePoint) ?? null;
    if (!point) {
      const atlas = resolveCityAtlasPoint(snapshot, destination);
      if (isAguasLindasRoutePoint(atlas)) point = atlas;
    }
    points.set(destination, point);
    return point;
  };
}
