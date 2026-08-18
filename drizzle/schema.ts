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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ createdAtIdx: index("route_searches_created_at_idx").on(table.createdAt), userIdx: index("route_searches_user_idx").on(table.userId) }));

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
  event: mysqlEnum("event", ["station_search", "map_open", "station_compare", "route_open", "favorite_intent", "favorite_saved", "account_cta", "redemption_requested", "social_instagram_click", "social_whatsapp_click", "alert_preference_saved", "anp_quality_open"]).notNull(),
  region: varchar("region", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ eventCreatedIdx: index("product_events_event_created_idx").on(table.event, table.createdAt), regionCreatedIdx: index("product_events_region_created_idx").on(table.region, table.createdAt) }));
