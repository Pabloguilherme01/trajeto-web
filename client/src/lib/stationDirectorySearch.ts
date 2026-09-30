export type Coordinates = { lat: number; lng: number };

export function normalizeStationSearchText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stationSearchTokens(value: string) {
  return normalizeStationSearchText(value).split(" ").filter(token => token.length >= 2);
}

export function stationMatchesSearch(fields: Array<string | null | undefined>, query: string) {
  const tokens = stationSearchTokens(query);
  if (!tokens.length) return true;
  const haystack = normalizeStationSearchText(fields.filter(Boolean).join(" "));
  return tokens.every(token => haystack.includes(token));
}

export function haversineKm(a: Coordinates, b: Coordinates) {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

export function getDistanceKm(origin: Coordinates | null | undefined, target: Coordinates | null | undefined) {
  if (!origin || !target) return null;
  return haversineKm(origin, target);
}
