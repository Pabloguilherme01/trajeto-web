export const productEventNames = ["station_search", "map_open", "station_compare", "route_open", "station_sheet_opened", "favorite_intent", "favorite_saved", "station_navigation_confirmed", "account_cta", "redemption_requested", "social_instagram_click", "social_whatsapp_click", "alert_preference_saved", "anp_quality_open", "google_page_token_invalid"] as const;

export type ProductEventName = (typeof productEventNames)[number];

export function normalizeRegion(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
  return normalized || null;
}
