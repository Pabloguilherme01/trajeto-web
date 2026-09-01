import type { Point } from "./stationRecommendation";

export function directionsWaypoint(point: Point) {
  return `${point.lat},${point.lng}`;
}

export function realDetourKm(baseDistanceMeters: number, stopDistanceMeters: number) {
  if (!Number.isFinite(baseDistanceMeters) || !Number.isFinite(stopDistanceMeters) || baseDistanceMeters < 0 || stopDistanceMeters < 0) return null;
  return Number((Math.max(0, stopDistanceMeters - baseDistanceMeters) / 1000).toFixed(1));
}
