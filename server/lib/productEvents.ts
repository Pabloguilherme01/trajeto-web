export const productEventNames = ["station_search", "map_open", "station_compare", "route_open", "station_sheet_opened", "favorite_intent", "favorite_saved", "station_navigation_confirmed", "redemption_requested", "alert_preference_saved", "anp_quality_open", "google_page_token_invalid"] as const;

export type ProductEventName = (typeof productEventNames)[number];

const COORDINATE_PAIR = /(^|[^\d])[-+]?\d{1,2}(?:\.\d{3,})?\s*[,;]\s*[-+]?\d{1,3}(?:\.\d{3,})?([^\d]|$)/;
const LOCATION_QUERY = /(?:^|[?&#\s])(?:lat|latitude|lng|lon|longitude|origin|origem|location)=/i;

export function containsSensitiveLocation(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return Boolean(text && (COORDINATE_PAIR.test(text) || LOCATION_QUERY.test(text)));
}

export function normalizeRegion(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
  if (!normalized || containsSensitiveLocation(normalized)) return null;
  return normalized;
}

export function productEventRegion(event: ProductEventName, value: string | null | undefined) {
  if (event !== "google_page_token_invalid") return null;
  return normalizeRegion(value);
}
