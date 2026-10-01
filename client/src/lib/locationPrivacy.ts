export type ParsedCoordinate = { lat: number; lng: number };

export const PRIVATE_LOCATION_LABEL = "Minha localização";

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

export function privateOriginForRouting(value: string) {
  if (isCurrentLocationLabel(value)) return "";
  return coarsenCoordinateText(value, 4);
}

export function privateRouteShareOrigin(value: string) {
  return isPreciseLocationText(value) ? PRIVATE_LOCATION_LABEL : value.trim();
}
