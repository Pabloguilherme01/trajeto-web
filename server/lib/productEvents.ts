export const productEventNames = ["station_search", "map_open", "station_compare", "route_open", "station_sheet_opened", "favorite_intent", "favorite_saved", "station_navigation_confirmed", "redemption_requested", "alert_preference_saved", "anp_quality_open", "google_page_token_invalid"] as const;

export type ProductEventName = (typeof productEventNames)[number];

export function normalizeRegion(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
  return normalized || null;
}
