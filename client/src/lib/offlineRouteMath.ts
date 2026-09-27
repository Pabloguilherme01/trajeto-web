export type OfflinePoint = { lat: number; lng: number; name?: string };

const toRad = (value: number) => (value * Math.PI) / 180;

export function distanceKm(a: OfflinePoint, b: OfflinePoint) {
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function straightLineRoute(origin: OfflinePoint, destination: OfflinePoint) {
  return {
    distanceKm: distanceKm(origin, destination),
    source: "estimativa local",
    warning: "Sem internet, a distância é uma estimativa em linha reta. Navegação e trânsito exigem conexão.",
  };
}

export function rankNearbyStops(
  destination: OfflinePoint,
  stops: OfflinePoint[],
  limit = 5,
) {
  return [...stops]
    .map(stop => ({ ...stop, distanceKm: distanceKm(destination, stop) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
