import { boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const routeSearches = mysqlTable("route_searches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  origin: varchar("origin", { length: 240 }).notNull(),
  destination: varchar("destination", { length: 240 }).notNull(),
  originLat: decimal("originLat", { precision: 10, scale: 7 }).notNull(),
  originLng: decimal("originLng", { precision: 10, scale: 7 }).notNull(),
  destinationLat: decimal("destinationLat", { precision: 10, scale: 7 }).notNull(),
  destinationLng: decimal("destinationLng", { precision: 10, scale: 7 }).notNull(),
  distanceMeters: int("distanceMeters").notNull(),
  durationSeconds: int("durationSeconds").notNull(),
  routeSummary: varchar("routeSummary", { length: 255 }),
  overviewPolyline: text("overviewPolyline"),
  locationConsent: boolean("locationConsent").default(false).notNull(),
  vehicleId: int("vehicleId"),
  vehicleNickname: varchar("vehicleNickname", { length: 80 }),
  selectedFuel: mysqlEnum("selectedFuel", ["gasoline", "ethanol"]),
  gasolinePrice: decimal("gasolinePrice", { precision: 8, scale: 3 }),
  ethanolPrice: decimal("ethanolPrice", { precision: 8, scale: 3 }),
  gasolineKmPerLiter: decimal("gasolineKmPerLiter", { precision: 6, scale: 2 }),
  ethanolKmPerLiter: decimal("ethanolKmPerLiter", { precision: 6, scale: 2 }),
  estimatedTripCost: decimal("estimatedTripCost", { precision: 10, scale: 2 }),
  estimatedLiters: decimal("estimatedLiters", { precision: 8, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ createdAtIdx: index("route_searches_created_at_idx").on(table.createdAt), userIdx: index("route_searches_user_idx").on(table.userId) }));

export const anpSyncRuns = mysqlTable("anp_sync_runs", {
  id: int("id").autoincrement().primaryKey(),
  dataset: mysqlEnum("dataset", ["authorized_stations", "price_references"]).notNull(),
  status: mysqlEnum("status", ["updated", "fallback", "failed"]).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 500 }).notNull(),
  attempts: int("attempts").default(1).notNull(),
  imported: int("imported").default(0).notNull(),
  message: varchar("message", { length: 1000 }),
  attemptedAt: timestamp("attemptedAt").defaultNow().notNull(),
}, table => ({ datasetAttemptedIdx: index("anp_sync_runs_dataset_attempted_idx").on(table.dataset, table.attemptedAt) }));

export const providerMetricSamples = mysqlTable("provider_metric_samples", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["google_maps", "tomtom", "anp"]).notNull(),
  operation: varchar("operation", { length: 80 }).notNull(),
  durationMs: int("durationMs").notNull(),
  success: boolean("success").notNull(),
  statusCode: int("statusCode"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ providerCreatedIdx: index("provider_metric_samples_provider_created_idx").on(table.provider, table.createdAt) }));

export const googlePlaceIdCache = mysqlTable("google_place_id_cache", {
  placeId: varchar("placeId", { length: 255 }).primaryKey(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
}, table => ({ expiresAtIdx: index("google_place_id_cache_expires_at_idx").on(table.expiresAt) }));

export const fuelPriceSnapshots = mysqlTable("fuel_price_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  placeId: varchar("placeId", { length: 255 }).notNull(),
  stationName: varchar("stationName", { length: 255 }).notNull(),
  product: mysqlEnum("product", ["gasoline", "ethanol", "diesel_s10", "diesel_s500", "gnv"]).notNull(),
  price: decimal("price", { precision: 8, scale: 3 }).notNull(),
  municipality: varchar("municipality", { length: 120 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  source: mysqlEnum("source", ["anp"]).default("anp").notNull(),
  sourceReference: varchar("sourceReference", { length: 500 }).notNull(),
  collectedAt: timestamp("collectedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ placeCollectedIdx: index("fuel_price_place_collected_idx").on(table.placeId, table.collectedAt) }));

export const authorizedFuelStations = mysqlTable("authorized_fuel_stations", {
  id: int("id").autoincrement().primaryKey(),
  authorization: varchar("authorization", { length: 32 }).notNull().unique(),
  legalName: varchar("legalName", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }).notNull(),
  complement: varchar("complement", { length: 255 }).notNull(),
  neighborhood: varchar("neighborhood", { length: 160 }).notNull(),
  zipCode: varchar("zipCode", { length: 12 }).notNull(),
  municipality: varchar("municipality", { length: 120 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  brand: varchar("brand", { length: 120 }).notNull(),
  sourceReference: varchar("sourceReference", { length: 500 }).notNull(),
  sourceUpdatedAt: timestamp("sourceUpdatedAt").notNull(),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
}, table => ({ municipalityStateIdx: index("authorized_fuel_stations_municipality_state_idx").on(table.municipality, table.state) }));

export const stationSearchPreferences = mysqlTable("station_search_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  mappedBrand: varchar("mappedBrand", { length: 120 }).default("all").notNull(),
  hoursStatus: varchar("hoursStatus", { length: 20 }).default("all").notNull(),
  sortBy: varchar("sortBy", { length: 20 }).default("distance").notNull(),
  anpNeighborhood: varchar("anpNeighborhood", { length: 160 }).default("all").notNull(),
  anpBrand: varchar("anpBrand", { length: 120 }).default("all").notNull(),
  resultsPerView: int("resultsPerView").default(10).notNull(),
  economicMode: boolean("economicMode").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIdx: index("station_search_preferences_user_idx").on(table.userId) }));

export const paginationAlertThresholds = mysqlTable("pagination_alert_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  region: varchar("region", { length: 120 }).notNull().unique(),
  threshold: int("threshold").default(3).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ regionIdx: index("pagination_alert_thresholds_region_idx").on(table.region) }));

export const paginationAlertThresholdHistory = mysqlTable("pagination_alert_threshold_history", {
  id: int("id").autoincrement().primaryKey(),
  region: varchar("region", { length: 120 }).notNull(),
  previousThreshold: int("previousThreshold"),
  threshold: int("threshold").notNull(),
  changedByUserId: int("changedByUserId").notNull(),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
}, table => ({ regionChangedIdx: index("pagination_alert_threshold_history_region_changed_idx").on(table.region, table.changedAt), changedByIdx: index("pagination_alert_threshold_history_changed_by_idx").on(table.changedByUserId, table.changedAt) }));

export const operationalAlerts = mysqlTable("operational_alerts", {
  id: int("id").autoincrement().primaryKey(),
  alertType: varchar("alertType", { length: 80 }).notNull(),
  region: varchar("region", { length: 120 }).notNull(),
  threshold: int("threshold").notNull(),
  observedCount: int("observedCount").notNull(),
  status: mysqlEnum("status", ["active", "acknowledged", "resolved"]).default("active").notNull(),
  firstDetectedAt: timestamp("firstDetectedAt").defaultNow().notNull(),
  lastDetectedAt: timestamp("lastDetectedAt").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  acknowledgedByUserId: int("acknowledgedByUserId"),
  resolvedAt: timestamp("resolvedAt"),
  recurrenceCount: int("recurrenceCount").default(1).notNull(),
  notificationCount: int("notificationCount").default(0).notNull(),
  lastNotifiedAt: timestamp("lastNotifiedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ typeRegionUnique: uniqueIndex("operational_alerts_type_region_unique").on(table.alertType, table.region), statusUpdatedIdx: index("operational_alerts_status_updated_idx").on(table.status, table.updatedAt) }));

export const operationalAutomationJobs = mysqlTable("operational_automation_jobs", {
  jobKey: varchar("jobKey", { length: 80 }).primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).notNull().unique(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userVehicles = mysqlTable("user_vehicles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nickname: varchar("nickname", { length: 80 }).notNull(),
  brand: varchar("brand", { length: 80 }),
  model: varchar("model", { length: 120 }),
  version: varchar("version", { length: 120 }),
  year: int("year"),
  fuelType: mysqlEnum("fuelType", ["gasoline", "ethanol", "flex", "diesel", "gnv", "electric", "other"]).default("flex").notNull(),
  tankLiters: decimal("tankLiters", { precision: 6, scale: 2 }),
  cityKmPerLiter: decimal("cityKmPerLiter", { precision: 6, scale: 2 }),
  highwayKmPerLiter: decimal("highwayKmPerLiter", { precision: 6, scale: 2 }),
  customKmPerLiter: decimal("customKmPerLiter", { precision: 6, scale: 2 }),
  notes: varchar("notes", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userUpdatedIdx: index("user_vehicles_user_updated_idx").on(table.userId, table.updatedAt) }));

export const redemptions = mysqlTable("redemptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  routeSearchId: int("routeSearchId").notNull(),
  placeId: varchar("placeId", { length: 255 }).notNull(),
  stationName: varchar("stationName", { length: 255 }).notNull(),
  stationAddress: varchar("stationAddress", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["requested", "cancelled", "completed"]).default("requested").notNull(),
  redemptionCode: varchar("redemptionCode", { length: 20 }).notNull().unique(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  fulfilledAt: timestamp("fulfilledAt"),
}, table => ({ requestedAtIdx: index("redemptions_requested_at_idx").on(table.requestedAt), routeIdx: index("redemptions_route_idx").on(table.routeSearchId) }));

export const consentEvents = mysqlTable("consent_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  purpose: mysqlEnum("purpose", ["sms_auth", "route_alerts", "location"]).notNull(),
  accepted: boolean("accepted").notNull(),
  phoneDigest: varchar("phoneDigest", { length: 128 }),
  phoneLast4: varchar("phoneLast4", { length: 4 }),
  policyVersion: varchar("policyVersion", { length: 32 }).notNull(),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
}, table => ({ capturedAtIdx: index("consent_events_captured_at_idx").on(table.capturedAt), userIdx: index("consent_events_user_idx").on(table.userId) }));

export const socialLinks = mysqlTable("social_links", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["instagram", "whatsapp", "tiktok", "youtube"]).notNull().unique(),
  url: varchar("url", { length: 500 }),
  active: boolean("active").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const favoriteStations = mysqlTable("favorite_stations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  placeId: varchar("placeId", { length: 255 }).notNull(),
  stationName: varchar("stationName", { length: 255 }).notNull(),
  stationAddress: varchar("stationAddress", { length: 500 }).notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userIdx: index("favorite_stations_user_idx").on(table.userId), userPlaceUnique: uniqueIndex("favorite_stations_user_place_unique").on(table.userId, table.placeId) }));

export const routeAlertPreferences = mysqlTable("route_alert_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  corridorId: varchar("corridorId", { length: 80 }).notNull(),
  corridorLabel: varchar("corridorLabel", { length: 120 }).notNull(),
  timeSlot: mysqlEnum("timeSlot", ["morning", "afternoon", "evening", "anytime"]).default("anytime").notNull(),
  minimumDelayMinutes: int("minimumDelayMinutes").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIdx: index("route_alert_preferences_user_idx").on(table.userId), userCorridorUnique: uniqueIndex("route_alert_preferences_user_corridor_unique").on(table.userId, table.corridorId) }));

export const trafficNotifications = mysqlTable("traffic_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  corridorId: varchar("corridorId", { length: 80 }).notNull(),
  corridorLabel: varchar("corridorLabel", { length: 120 }).notNull(),
  incidentId: varchar("incidentId", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  detail: varchar("detail", { length: 500 }).notNull(),
  severity: mysqlEnum("severity", ["minor", "moderate", "major", "unknown"]).default("unknown").notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
}, table => ({
  userIssuedIdx: index("traffic_notifications_user_issued_idx").on(table.userId, table.issuedAt),
  userReadIdx: index("traffic_notifications_user_read_idx").on(table.userId, table.readAt),
  userCorridorIncidentUnique: uniqueIndex("traffic_notifications_user_corridor_incident_unique").on(table.userId, table.corridorId, table.incidentId),
}));

export const productEvents = mysqlTable("product_events", {
  id: int("id").autoincrement().primaryKey(),
  event: mysqlEnum("event", ["station_search", "map_open", "station_compare", "route_open", "station_sheet_opened", "favorite_intent", "favorite_saved", "station_navigation_confirmed", "account_cta", "redemption_requested", "social_instagram_click", "social_whatsapp_click", "alert_preference_saved", "anp_quality_open", "google_page_token_invalid"]).notNull(),
  region: varchar("region", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ eventCreatedIdx: index("product_events_event_created_idx").on(table.event, table.createdAt), regionCreatedIdx: index("product_events_region_created_idx").on(table.region, table.createdAt) }));
