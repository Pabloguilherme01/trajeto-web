export type ParsedCoordinate = { lat: number; lng: number };

export const PRIVATE_LOCATION_LABEL = "Minha localização";

let privateLocationHandoff: ParsedCoordinate | null = null;

function isValidCoordinatePoint(point: ParsedCoordinate) {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}

export function setPrivateLocationHandoff(point: ParsedCoordinate) {
  privateLocationHandoff = isValidCoordinatePoint(point)
    ? { lat: point.lat, lng: point.lng }
    : null;
  return Boolean(privateLocationHandoff);
}

export function consumePrivateLocationHandoff() {
  const point = privateLocationHandoff;
  privateLocationHandoff = null;
  return point;
}

export function clearPrivateLocationHandoff() {
  const hadValue = Boolean(privateLocationHandoff);
  privateLocationHandoff = null;
  return hadValue;
}

export function parseCoordinateText(value: string): ParsedCoordinate | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function isCurrentLocationLabel(value: string) {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  return normalized === "minha localização" ||
    normalized === "minha localizacao" ||
    normalized === "localização atual" ||
    normalized === "localizacao atual";
}

export function isPreciseLocationText(value: string) {
  return Boolean(parseCoordinateText(value)) || isCurrentLocationLabel(value);
}

export function privateOriginForUrl(value: string) {
  return isPreciseLocationText(value) ? "" : value.trim();
}

export function privateOriginForHistory(value: string) {
  return isPreciseLocationText(value) ? PRIVATE_LOCATION_LABEL : value.trim();
}

export function privateOriginForExternalNavigation(value: string) {
  return isPreciseLocationText(value) ? "" : value.trim();
}

export function coarsenCoordinateText(value: string, decimals = 4) {
  const parsed = parseCoordinateText(value);
  if (!parsed) return value.trim();
  const safeDecimals = Math.max(2, Math.min(4, Math.floor(decimals)));
  return parsed.lat.toFixed(safeDecimals) + ", " + parsed.lng.toFixed(safeDecimals);
}

export function coarsenCoordinatePoint(point: ParsedCoordinate, decimals = 3): ParsedCoordinate {
  const safeDecimals = Math.max(2, Math.min(4, Math.floor(decimals)));
  const scale = 10 ** safeDecimals;
  return {
    lat: Math.round(point.lat * scale) / scale,
    lng: Math.round(point.lng * scale) / scale,
  };
}

export function privateOriginForRouting(value: string) {
  if (isCurrentLocationLabel(value)) return "";
  return coarsenCoordinateText(value, 3);
}

export function privateRouteShareOrigin(value: string) {
  return isPreciseLocationText(value) ? PRIVATE_LOCATION_LABEL : value.trim();
}

const PRIVATE_HISTORY_KEYS = [
  "trajeto-recent-searches",
  "trajeto-last-trip",
  "trajeto-recent-trips",
  "trajeto-route-usage",
  "trajeto-route-usage-events",
  "trajeto-last-station",
] as const;

export function clearPrivateLocationHistory() {
  let cleared = clearPrivateLocationHandoff();
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    let storage: Storage | null = null;
    try {
      storage = globalThis[storageName] ?? null;
    } catch {
      storage = null;
    }
    if (!storage) continue;

    for (const key of PRIVATE_HISTORY_KEYS) {
      if (storage.getItem(key) !== null) cleared = true;
      storage.removeItem(key);
    }

    const routingKeys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith("trajeto:public-routing:")) routingKeys.push(key);
    }
    for (const key of routingKeys) {
      storage.removeItem(key);
      cleared = true;
    }
  }
  return cleared;
}
