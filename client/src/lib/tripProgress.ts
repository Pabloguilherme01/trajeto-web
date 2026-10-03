import { isMapPoint, type MapPoint } from "./mapGeometry";

export function metersBetween(a: MapPoint, b: MapPoint) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function tripProgress(position: MapPoint, points: MapPoint[], distance: number, duration: number, estimated = false, accuracy = 0) {
  if (!isMapPoint(position) || points.length < 2 || !points.every(isMapPoint) || !Number.isFinite(distance) || distance <= 0 || !Number.isFinite(duration) || duration < 0) return null;
  const destinationDistance = metersBetween(position, points[points.length - 1]);
  if (estimated) {
    const remaining = destinationDistance / Math.max(1, metersBetween(points[0], points[points.length - 1]));
    return { distanceMeters: distance * remaining, durationSeconds: duration * remaining, offRoute: false, nearDestination: destinationDistance <= 50 && accuracy <= 50 };
  }
  const lengths = points.slice(1).map((p, i) => metersBetween(points[i], p));
  const total = lengths.reduce((sum, v) => sum + v, 0);
  if (!total) return null;
  let covered = 0, nearest = Infinity, progress = 0;
  for (let i = 0; i < lengths.length; i++) {
    const a = points[i], b = points[i + 1];
    const xScale = Math.cos(position.lat * Math.PI / 180);
    const ax = (a.lng - position.lng) * xScale, ay = a.lat - position.lat;
    const dx = (b.lng - a.lng) * xScale, dy = b.lat - a.lat;
    const denominator = dx * dx + dy * dy;
    const t = denominator ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator)) : 0;
    const projected = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
    const separation = metersBetween(position, projected);
    if (separation < nearest) { nearest = separation; progress = covered + lengths[i] * t; }
    covered += lengths[i];
  }
  const ratio = Math.max(0, Math.min(1, 1 - progress / total));
  return { distanceMeters: distance * ratio, durationSeconds: duration * ratio, offRoute: nearest > Math.max(80, accuracy * 2), nearDestination: destinationDistance <= 50 && accuracy <= 50 };
}
