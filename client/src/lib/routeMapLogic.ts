import type { CityAtlasItem } from "@/lib/cityAtlas";
import { isMapPoint } from "@/lib/mapGeometry";
import { LOCAL_GEOCODE_POINTS } from "@/lib/localGeocoding";

export type RouteStep = {
  instruction: string;
  name?: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver?: string;
};

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earth = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

export function nearbyRouteReferences(
  origin: { lat: number; lng: number } | undefined,
  destination: { lat: number; lng: number } | undefined,
  routePoints: Array<{ lat: number; lng: number }>,
) {
  const anchors =
    routePoints.length > 1
      ? routePoints.filter(isMapPoint)
      : [origin, destination].filter(
          (point): point is { lat: number; lng: number } => Boolean(point),
        );

  if (!anchors.length) return [];
  return LOCAL_GEOCODE_POINTS.map(point => ({
    point,
    distance: distanceToRoute(point, anchors),
  }))
    .filter(item => item.distance <= 3_000)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6)
    .map(({ point }) => ({
      id: "route-reference:" + point.id,
      name: point.name,
      address: "Referência próxima · " + point.sourceLabel,
      lat: point.lat,
      lng: point.lng,
      source: "local" as const,
    }));
}

/** Project onto every segment so references along a long road are not missed. */
export function distanceToRoute(point: { lat: number; lng: number }, anchors: Array<{ lat: number; lng: number }>) {
  if (!isMapPoint(point) || !anchors.length) return Infinity;
  let nearest = Infinity;
  const longitudeScale = 111_320 * Math.cos(point.lat * Math.PI / 180);
  for (let index = 0; index < anchors.length; index++) {
    const a = anchors[index];
    const b = anchors[index + 1];
    if (!isMapPoint(a)) continue;
    nearest = Math.min(nearest, distanceMeters(point, a));
    if (!isMapPoint(b)) continue;
    const ax = (a.lng - point.lng) * longitudeScale, ay = (a.lat - point.lat) * 110_574;
    const dx = (b.lng - a.lng) * longitudeScale, dy = (b.lat - a.lat) * 110_574;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
    nearest = Math.min(nearest, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return nearest;
}

export function nearbyBusinessReferences(
  items: CityAtlasItem[],
  destination?: { lat: number; lng: number },
) {
  if (!isMapPoint(destination)) return [];
  return items
    .filter(
      item =>
        typeof item.lat === "number" &&
        typeof item.lng === "number" &&
        Math.abs(item.lat - destination.lat) < 0.01 &&
        Math.abs(item.lng - destination.lng) < 0.01,
    )
    .map(item => ({
      item,
      distance: distanceMeters(destination, { lat: item.lat!, lng: item.lng! }),
    }))
    .filter(entry => entry.distance <= 800)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6)
    .map(({ item }) => ({
      id: item.id,
      name: item.name,
      lat: item.lat!,
      lng: item.lng!,
      label: "R",
      precision: item.coordinateLabel,
    }));
}

export function currentRouteGuidance(
  steps: RouteStep[],
  totalDistanceMeters: number | null | undefined,
  remainingDistanceMeters: number | null | undefined,
) {
  if (
    !steps.length ||
    !Number.isFinite(totalDistanceMeters) ||
    !Number.isFinite(remainingDistanceMeters) ||
    Number(totalDistanceMeters) <= 0
  )
    return null;

  const completed = Math.max(
    0,
    Math.min(
      Number(totalDistanceMeters),
      Number(totalDistanceMeters) - Number(remainingDistanceMeters),
    ),
  );
  let cursor = 0;
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const length = Math.max(0, Number(step.distanceMeters) || 0);
    const end = cursor + length;
    if (completed < end || index === steps.length - 1) {
      return {
        index,
        step,
        distanceToManeuver: Math.max(0, end - completed),
        nextStep: steps[index + 1] ?? null,
      };
    }
    cursor = end;
  }
  return null;
}

export function maneuverSymbol(maneuver?: string) {
  const [type, modifier] = (maneuver ?? "").toLowerCase().split(":");
  if (type === "arrive") return "arrival";
  if (modifier === "uturn") return "uturn";
  if (type === "roundabout" || type === "rotary") return "roundabout";
  if (modifier === "slight left") return "slight-left";
  if (modifier === "slight right") return "slight-right";
  if (modifier?.includes("left")) return "left";
  if (modifier?.includes("right")) return "right";
  return "straight";
}
