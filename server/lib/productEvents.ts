export const productEventNames = ["station_search", "map_open", "station_compare", "route_open", "favorite_intent", "favorite_saved", "account_cta", "redemption_requested"] as const;

export type ProductEventName = (typeof productEventNames)[number];

export function normalizeRegion(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
  return normalized || null;
}
