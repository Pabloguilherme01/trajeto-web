import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { anpSyncRuns, authorizedFuelStations, consentEvents, favoriteStations, fuelPriceSnapshots, googlePlaceIdCache, InsertUser, paginationAlertThresholdHistory, paginationAlertThresholds, productEvents, providerMetricSamples, redemptions, routeAlertPreferences, routeSearches, socialLinks, stationSearchPreferences, trafficNotifications, userVehicles, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { favoriteStationValues, type FavoriteStationInput } from "./lib/favoriteStation";
import { normalizeRegion, type ProductEventName } from "./lib/productEvents";
import { aggregateDailyTimestamps, buildWeeklyTrend } from "./lib/weeklyTrends";
import type { AuthorizedStationImport } from "./lib/anpAuthorizedStations";
import { normalizeStationSearchPreferences, stationSearchPreferenceDefaults, type StationSearchPreferenceInput } from "./lib/stationSearchPreferences";
import { classifyProviderHealth } from "./lib/providerHealth";
import { buildGoogleMapsWeeklyStability } from "./lib/googleMapsStability";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type UserVehicleInput = {
  nickname: string; brand?: string | null; model?: string | null; version?: string | null; year?: number | null;
  fuelType: "gasoline" | "ethanol" | "flex" | "diesel" | "gnv" | "electric" | "other";
  tankLiters?: number | null; cityKmPerLiter?: number | null; highwayKmPerLiter?: number | null; customKmPerLiter?: number | null; notes?: string | null;
};

function userVehicleValues(input: UserVehicleInput) {
  return {
    ...input,
    brand: input.brand || null, model: input.model || null, version: input.version || null, notes: input.notes || null,
    year: input.year ?? null,
    tankLiters: input.tankLiters == null ? null : String(input.tankLiters),
    cityKmPerLiter: input.cityKmPerLiter == null ? null : String(input.cityKmPerLiter),
    highwayKmPerLiter: input.highwayKmPerLiter == null ? null : String(input.highwayKmPerLiter),
    customKmPerLiter: input.customKmPerLiter == null ? null : String(input.customKmPerLiter),
  };
}

export async function getUserVehicles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userVehicles).where(eq(userVehicles.userId, userId)).orderBy(desc(userVehicles.updatedAt));
}

export async function getUserVehicleById(userId: number, vehicleId: number) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(userVehicles).where(and(eq(userVehicles.id, vehicleId), eq(userVehicles.userId, userId))).limit(1))[0] ?? null;
}

export async function createUserVehicle(userId: number, input: UserVehicleInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.insert(userVehicles).values({ userId, ...userVehicleValues(input) });
  return getUserVehicles(userId);
}

export async function updateUserVehicle(userId: number, vehicleId: number, input: UserVehicleInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.update(userVehicles).set(userVehicleValues(input)).where(and(eq(userVehicles.id, vehicleId), eq(userVehicles.userId, userId)));
  return getUserVehicles(userId);
}

export async function deleteUserVehicle(userId: number, vehicleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.delete(userVehicles).where(and(eq(userVehicles.id, vehicleId), eq(userVehicles.userId, userId)));
  return { removed: true };
}

export async function createRouteSearch(input: {
  userId: number | null; origin: string; destination: string; originLat: number; originLng: number; destinationLat: number; destinationLng: number;
  distanceMeters: number; durationSeconds: number; routeSummary: string | null; overviewPolyline: string | null; locationConsent: boolean;
  vehicleId?: number | null; vehicleNickname?: string | null; selectedFuel?: "gasoline" | "ethanol" | null;
  gasolinePrice?: number | null; ethanolPrice?: number | null; gasolineKmPerLiter?: number | null; ethanolKmPerLiter?: number | null; estimatedTripCost?: number | null; estimatedLiters?: number | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(routeSearches).values({
    ...input,
    originLat: String(input.originLat), originLng: String(input.originLng), destinationLat: String(input.destinationLat), destinationLng: String(input.destinationLng),
    gasolinePrice: input.gasolinePrice == null ? null : String(input.gasolinePrice), ethanolPrice: input.ethanolPrice == null ? null : String(input.ethanolPrice),
    gasolineKmPerLiter: input.gasolineKmPerLiter == null ? null : String(input.gasolineKmPerLiter), ethanolKmPerLiter: input.ethanolKmPerLiter == null ? null : String(input.ethanolKmPerLiter),
    estimatedTripCost: input.estimatedTripCost == null ? null : String(input.estimatedTripCost), estimatedLiters: input.estimatedLiters == null ? null : String(input.estimatedLiters),
  });
  return { id: Number(result[0].insertId) };
}

export async function getRouteSearchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(routeSearches).where(eq(routeSearches.id, id)).limit(1))[0] ?? null;
}

export async function getLatestPriceSnapshots(placeIds: string[]) {
  const db = await getDb();
  if (!db || placeIds.length === 0) return [];
  const rows = await db.select().from(fuelPriceSnapshots).where(inArray(fuelPriceSnapshots.placeId, placeIds)).orderBy(desc(fuelPriceSnapshots.collectedAt));
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = `${row.placeId}-${row.product}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function rememberGooglePlaceIds(placeIds: string[]) {
  const db = await getDb();
  const uniqueIds = Array.from(new Set(placeIds.filter(Boolean)));
  if (!db || uniqueIds.length === 0) return;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await db.delete(googlePlaceIdCache).where(sql`${googlePlaceIdCache.expiresAt} < ${now}`);
  await db.insert(googlePlaceIdCache).values(uniqueIds.map(placeId => ({ placeId, lastSeenAt: now, expiresAt }))).onDuplicateKeyUpdate({
    set: { lastSeenAt: now, expiresAt },
  });
}

export async function getPriceReferencesByAreas(areas: Array<{ municipality: string; state: string }>) {
  const db = await getDb();
  if (!db || areas.length === 0) return [];
  const conditions = areas.map(area => and(eq(fuelPriceSnapshots.municipality, area.municipality), eq(fuelPriceSnapshots.state, area.state)));
  const rows = await db.select().from(fuelPriceSnapshots).where(or(...conditions)).orderBy(desc(fuelPriceSnapshots.collectedAt)).limit(24);
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = `${row.placeId}-${row.product}-${row.collectedAt.getTime()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function replaceAnpPriceSnapshots(sourceReference: string, rows: Array<{
  placeId: string; stationName: string; product: "gasoline" | "ethanol" | "diesel_s10" | "diesel_s500" | "gnv"; price: string; municipality: string; state: string; collectedAt: Date;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.delete(fuelPriceSnapshots).where(eq(fuelPriceSnapshots.sourceReference, sourceReference));
  for (let start = 0; start < rows.length; start += 400) {
    await db.insert(fuelPriceSnapshots).values(rows.slice(start, start + 400).map(row => ({ ...row, source: "anp" as const, sourceReference })));
  }
  return { imported: rows.length };
}

export async function createConsentEvent(input: {
  userId: number | null; purpose: "sms_auth" | "route_alerts" | "location"; accepted: boolean; phoneDigest: string | null; phoneLast4: string | null; policyVersion: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(consentEvents).values(input);
}

export async function getPublicSocialLinks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialLinks).where(eq(socialLinks.active, true));
}

export async function getSocialLinks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialLinks).orderBy(socialLinks.platform);
}

export async function upsertSocialLinks(links: Array<{ platform: "instagram" | "whatsapp" | "tiktok" | "youtube"; url: string | null; active: boolean }>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  for (const link of links) {
    await db.insert(socialLinks).values(link).onDuplicateKeyUpdate({ set: { url: link.url, active: link.active } });
  }
}

export async function createRedemption(input: {
  userId: number; routeSearchId: number; placeId: string; stationName: string; stationAddress: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const code = `TRJ-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const result = await db.insert(redemptions).values({ ...input, redemptionCode: code });
  return { id: Number(result[0].insertId), code, status: "requested" as const };
}

export async function getPersonalOverview(userId: number) {
  const db = await getDb();
  if (!db) return { routes: [], redemptions: [], favorites: [], alerts: [] };
  const [routes, userRedemptions, favorites, alerts] = await Promise.all([
    db.select().from(routeSearches).where(eq(routeSearches.userId, userId)).orderBy(desc(routeSearches.createdAt)).limit(12),
    db.select().from(redemptions).where(eq(redemptions.userId, userId)).orderBy(desc(redemptions.requestedAt)).limit(12),
    db.select().from(favoriteStations).where(eq(favoriteStations.userId, userId)).orderBy(desc(favoriteStations.createdAt)).limit(24),
    getRouteAlertPreferences(userId),
  ]);
  return { routes, redemptions: userRedemptions, favorites, alerts };
}

export async function getFavoritePlaceIds(userId: number, placeIds: string[]) {
  const db = await getDb();
  if (!db || placeIds.length === 0) return [];
  const rows = await db.select({ placeId: favoriteStations.placeId }).from(favoriteStations).where(and(eq(favoriteStations.userId, userId), inArray(favoriteStations.placeId, placeIds)));
  return rows.map(row => row.placeId);
}

export async function getStationSearchPreferences(userId: number) {
  const db = await getDb();
  if (!db) return stationSearchPreferenceDefaults;
  const preference = (await db.select().from(stationSearchPreferences).where(eq(stationSearchPreferences.userId, userId)).limit(1))[0];
  if (!preference) return stationSearchPreferenceDefaults;
  return normalizeStationSearchPreferences({
    mappedBrand: preference.mappedBrand,
    hoursStatus: preference.hoursStatus as "all" | "open" | "closed" | "unknown",
    sortBy: preference.sortBy as "distance" | "brand" | "hours",
    anpNeighborhood: preference.anpNeighborhood,
    anpBrand: preference.anpBrand,
    resultsPerView: preference.resultsPerView as 5 | 10 | 20,
    economicMode: preference.economicMode,
  });
}

export async function upsertStationSearchPreferences(userId: number, input: StationSearchPreferenceInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const values = normalizeStationSearchPreferences(input);
  await db.insert(stationSearchPreferences).values({ userId, ...values }).onDuplicateKeyUpdate({ set: values });
  return values;
}

export async function getPaginationAlertThresholds() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(paginationAlertThresholds).orderBy(paginationAlertThresholds.region);
}

export async function getPaginationAlertThresholdHistory(limit = 24) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(paginationAlertThresholdHistory).orderBy(desc(paginationAlertThresholdHistory.changedAt)).limit(Math.min(100, Math.max(1, limit)));
}

export async function upsertPaginationAlertThreshold(input: { region: string; threshold: number; changedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const region = input.region.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!region) throw new Error("Região obrigatória.");
  const threshold = Math.min(100, Math.max(1, Math.round(input.threshold)));
  const existing = (await db.select({ threshold: paginationAlertThresholds.threshold }).from(paginationAlertThresholds).where(eq(paginationAlertThresholds.region, region)).limit(1))[0];
  await db.insert(paginationAlertThresholds).values({ region, threshold }).onDuplicateKeyUpdate({ set: { threshold } });
  if (existing?.threshold !== threshold) await db.insert(paginationAlertThresholdHistory).values({ region, previousThreshold: existing?.threshold ?? null, threshold, changedByUserId: input.changedByUserId });
  return { region, threshold, changed: existing?.threshold !== threshold };
}

export async function addFavoriteStation(userId: number, input: FavoriteStationInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const values = favoriteStationValues(input);
  await db.insert(favoriteStations).values({ userId, ...values }).onDuplicateKeyUpdate({ set: { stationName: values.stationName, stationAddress: values.stationAddress, lat: values.lat, lng: values.lng } });
  return { favorited: true };
}

export async function removeFavoriteStation(userId: number, placeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.delete(favoriteStations).where(and(eq(favoriteStations.userId, userId), eq(favoriteStations.placeId, placeId)));
  return { favorited: false };
}

export type RouteAlertPreferenceInput = {
  corridorId: string;
  corridorLabel: string;
  timeSlot: "morning" | "afternoon" | "evening" | "anytime";
  minimumDelayMinutes: number;
  active: boolean;
};

export async function getRouteAlertPreferences(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routeAlertPreferences).where(eq(routeAlertPreferences.userId, userId)).orderBy(desc(routeAlertPreferences.updatedAt));
}

export async function upsertRouteAlertPreference(userId: number, input: RouteAlertPreferenceInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.insert(routeAlertPreferences).values({ userId, ...input }).onDuplicateKeyUpdate({ set: { corridorLabel: input.corridorLabel, timeSlot: input.timeSlot, minimumDelayMinutes: input.minimumDelayMinutes, active: input.active } });
  return { saved: true };
}

export async function removeRouteAlertPreference(userId: number, corridorId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.delete(routeAlertPreferences).where(and(eq(routeAlertPreferences.userId, userId), eq(routeAlertPreferences.corridorId, corridorId)));
  return { removed: true };
}

const authorizedMunicipalityForQuery = (query: string) => {
  const normalized = (normalizeRegion(query) ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("aguas lindas")) return "AGUAS LINDAS DE GOIAS";
  if (normalized.includes("ceilandia")) return "CEILANDIA";
  if (normalized.includes("taguatinga")) return "TAGUATINGA";
  if (normalized.includes("brasilia")) return "BRASILIA";
  if (normalized.includes("valparaiso")) return "VALPARAISO DE GOIAS";
  if (normalized.includes("cidade ocidental")) return "CIDADE OCIDENTAL";
  if (normalized.includes("luziania")) return "LUZIANIA";
  if (normalized.includes("formosa")) return "FORMOSA";
  if (normalized.includes("planaltina")) return "PLANALTINA";
  if (normalized.includes("santo antonio")) return "SANTO ANTONIO DO DESCOBERTO";
  return null;
};

export type AuthorizedStationFilters = { neighborhood?: string; brand?: string };

export async function getAuthorizedStationsForQuery(query: string, filters: AuthorizedStationFilters = {}) {
  const db = await getDb();
  const municipality = authorizedMunicipalityForQuery(query);
  if (!db || !municipality) return [];
  const rows = await db.select().from(authorizedFuelStations).where(eq(authorizedFuelStations.municipality, municipality)).orderBy(authorizedFuelStations.legalName).limit(100);
  const neighborhood = filters.neighborhood?.trim().toLocaleLowerCase("pt-BR");
  const brand = filters.brand?.trim().toLocaleLowerCase("pt-BR");
  return rows.filter(row => (!neighborhood || neighborhood === "all" || row.neighborhood.toLocaleLowerCase("pt-BR") === neighborhood) && (!brand || brand === "all" || row.brand.toLocaleLowerCase("pt-BR") === brand));
}

export async function replaceAuthorizedStations(stations: AuthorizedStationImport[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  if (stations.length === 0) return { imported: 0 };
  await db.insert(authorizedFuelStations).values(stations).onDuplicateKeyUpdate({ set: {
    legalName: sql`VALUES(${authorizedFuelStations.legalName})`,
    address: sql`VALUES(${authorizedFuelStations.address})`,
    complement: sql`VALUES(${authorizedFuelStations.complement})`,
    neighborhood: sql`VALUES(${authorizedFuelStations.neighborhood})`,
    zipCode: sql`VALUES(${authorizedFuelStations.zipCode})`,
    brand: sql`VALUES(${authorizedFuelStations.brand})`,
    sourceReference: sql`VALUES(${authorizedFuelStations.sourceReference})`,
    sourceUpdatedAt: sql`VALUES(${authorizedFuelStations.sourceUpdatedAt})`,
  } });
  return { imported: stations.length };
}

export async function recordAnpSyncRun(input: { dataset: "authorized_stations" | "price_references"; status: "updated" | "fallback" | "failed"; sourceUrl: string; attempts: number; imported: number; message?: string | null }) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(anpSyncRuns).values(input);
  return getLatestAnpSyncRun(input.dataset);
}

export async function getLatestAnpSyncRun(dataset: "authorized_stations" | "price_references" = "authorized_stations") {
  const db = await getDb();
  if (!db) return null;
  const recorded = (await db.select().from(anpSyncRuns).where(eq(anpSyncRuns.dataset, dataset)).orderBy(desc(anpSyncRuns.attemptedAt)).limit(1))[0] ?? null;
  if (recorded || dataset !== "authorized_stations") return recorded;
  const legacyCatalog = (await db.select({ sourceReference: authorizedFuelStations.sourceReference, importedAt: authorizedFuelStations.importedAt }).from(authorizedFuelStations).orderBy(desc(authorizedFuelStations.importedAt)).limit(1))[0] ?? null;
  if (!legacyCatalog) return null;
  return { id: 0, dataset: "authorized_stations" as const, status: "updated" as const, sourceUrl: legacyCatalog.sourceReference, attempts: 0, imported: 0, message: "Data inferida do catálogo ANP já armazenado; a próxima atualização registrará tentativas e quantidade importada.", attemptedAt: legacyCatalog.importedAt };
}

export type ProviderMetricInput = { provider: "google_maps" | "tomtom" | "anp"; operation: string; durationMs: number; success: boolean; statusCode?: number | null };

export async function recordProviderMetric(input: ProviderMetricInput) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(providerMetricSamples).values({ ...input, operation: input.operation.slice(0, 80), durationMs: Math.max(0, Math.round(input.durationMs)), statusCode: input.statusCode ?? null });
  } catch (error) {
    console.warn("[Provider metrics] Metric was not persisted:", error);
  }
}

export type ProviderMetricSummary = {
  provider: "google_maps" | "tomtom" | "anp";
  operation: string;
  count: number;
  successRate: number;
  averageMs: number;
  p95Ms: number;
  latestAt: Date;
  health: ReturnType<typeof classifyProviderHealth>;
};

export async function getProviderMetricSummary(hours = 24): Promise<{ since: Date; hours: number; samples: ProviderMetricSummary[] }> {
  const db = await getDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  if (!db) return { since, hours, samples: [] };
  const rows = (await db.select().from(providerMetricSamples).orderBy(desc(providerMetricSamples.createdAt)).limit(500)).filter(row => row.createdAt >= since);
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.provider}:${row.operation}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  const samples = Array.from(grouped.values()).map(group => {
    const orderedDurations = group.map(row => row.durationMs).sort((a, b) => a - b);
    const averageMs = Math.round(orderedDurations.reduce((sum, value) => sum + value, 0) / orderedDurations.length);
    const p95Ms = orderedDurations[Math.min(orderedDurations.length - 1, Math.ceil(orderedDurations.length * 0.95) - 1)] ?? 0;
    const successRate = Math.round((group.filter(row => row.success).length / group.length) * 100);
    return { provider: group[0].provider, operation: group[0].operation, count: group.length, successRate, averageMs, p95Ms, latestAt: group[0].createdAt, health: classifyProviderHealth({ count: group.length, successRate, p95Ms }) };
  }).sort((a, b) => a.provider.localeCompare(b.provider) || a.operation.localeCompare(b.operation));
  return { since, hours, samples };
}

export async function getGoogleMapsWeeklyStability() {
  const db = await getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (!db) return buildGoogleMapsWeeklyStability([], []);
  const [metricRows, tokenRows] = await Promise.all([
    db.select({ createdAt: providerMetricSamples.createdAt, success: providerMetricSamples.success, durationMs: providerMetricSamples.durationMs }).from(providerMetricSamples).where(eq(providerMetricSamples.provider, "google_maps")).orderBy(desc(providerMetricSamples.createdAt)).limit(1_000),
    db.select({ createdAt: productEvents.createdAt }).from(productEvents).where(eq(productEvents.event, "google_page_token_invalid")).orderBy(desc(productEvents.createdAt)).limit(1_000),
  ]);
  const rows = metricRows.filter(row => row.createdAt >= since);
  return buildGoogleMapsWeeklyStability(rows, tokenRows.filter(row => row.createdAt >= since));
}

export type TrafficNotificationInput = {
  userId: number;
  corridorId: string;
  corridorLabel: string;
  incidentId: string;
  title: string;
  detail: string;
  severity: "minor" | "moderate" | "major" | "unknown";
};

export async function createTrafficNotifications(inputs: TrafficNotificationInput[]) {
  const db = await getDb();
  if (!db || inputs.length === 0) return [];
  const created: TrafficNotificationInput[] = [];
  for (const input of inputs) {
    const existing = await db.select({ id: trafficNotifications.id }).from(trafficNotifications).where(and(
      eq(trafficNotifications.userId, input.userId),
      eq(trafficNotifications.corridorId, input.corridorId),
      eq(trafficNotifications.incidentId, input.incidentId),
    )).limit(1);
    if (existing.length) continue;
    await db.insert(trafficNotifications).values(input).onDuplicateKeyUpdate({ set: { title: input.title, detail: input.detail, severity: input.severity } });
    created.push(input);
  }
  return created;
}

export async function getTrafficNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trafficNotifications).where(eq(trafficNotifications.userId, userId)).orderBy(desc(trafficNotifications.issuedAt)).limit(12);
}

export async function markTrafficNotificationsRead(userId: number, ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return { updated: 0 };
  const result = await db.update(trafficNotifications).set({ readAt: new Date() }).where(and(eq(trafficNotifications.userId, userId), inArray(trafficNotifications.id, ids)));
  return { updated: result[0].affectedRows };
}

export async function createProductEvent(input: { event: ProductEventName; region?: string | null }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(productEvents).values({ event: input.event, region: normalizeRegion(input.region) });
}

const conversionFunnelStages: Array<{ event: ProductEventName; label: string }> = [
  { event: "route_open", label: "Rotas abertas" },
  { event: "station_sheet_opened", label: "Fichas abertas" },
  { event: "favorite_saved", label: "Favoritos salvos" },
  { event: "station_navigation_confirmed", label: "Navegações confirmadas" },
];

export async function getOperationalOverview() {
  const db = await getDb();
  if (!db) return { totals: { routeSearches: 0, redemptions: 0, pendingRedemptions: 0, consentEvents: 0 }, recentRoutes: [], recentRedemptions: [], topRoutes: [], growthEvents: [], conversionFunnel: conversionFunnelStages.map(stage => ({ ...stage, total: 0 })), invalidPageTokensByRegion: [], paginationAlertThresholds: [], paginationAlertThresholdHistory: [], googleMapsWeeklyStability: buildGoogleMapsWeeklyStability([], []), weeklyTrend: buildWeeklyTrend([]).map(day => ({ ...day, savedAlerts: 0 })), anpAuthorizedSync: null, providerMetrics: { since: new Date(), hours: 24, samples: [] as ProviderMetricSummary[] } };

  const [[routeCount], [redemptionCount], [pendingCount], [consentCount], recentRoutes, recentRedemptions, topRoutes, growthEvents, invalidPageTokensByRegion, paginationAlertThresholds, paginationAlertThresholdHistory, googleMapsWeeklyStability, notificationTrendRows, savedAlertTrendRows, anpAuthorizedSync, providerMetrics] = await Promise.all([
    db.select({ value: count() }).from(routeSearches),
    db.select({ value: count() }).from(redemptions),
    db.select({ value: count() }).from(redemptions).where(eq(redemptions.status, "requested")),
    db.select({ value: count() }).from(consentEvents),
    db.select().from(routeSearches).orderBy(desc(routeSearches.createdAt)).limit(8),
    db.select().from(redemptions).orderBy(desc(redemptions.requestedAt)).limit(8),
    db.select({ origin: routeSearches.origin, destination: routeSearches.destination, consultations: sql<number>`count(*)` }).from(routeSearches).groupBy(routeSearches.origin, routeSearches.destination).orderBy(desc(sql`count(*)`)).limit(6),
    db.select({ event: productEvents.event, total: count() }).from(productEvents).groupBy(productEvents.event),
    db.select({ region: productEvents.region, total: count() }).from(productEvents).where(eq(productEvents.event, "google_page_token_invalid")).groupBy(productEvents.region).orderBy(desc(sql`count(*)`)).limit(10),
    getPaginationAlertThresholds(),
    getPaginationAlertThresholdHistory(),
    getGoogleMapsWeeklyStability(),
    db.select({ issuedAt: trafficNotifications.issuedAt }).from(trafficNotifications),
    db.select({ createdAt: productEvents.createdAt }).from(productEvents).where(eq(productEvents.event, "alert_preference_saved")),
    getLatestAnpSyncRun("authorized_stations"),
    getProviderMetricSummary(24),
  ]);

  const notificationTrend = aggregateDailyTimestamps(notificationTrendRows.map(row => row.issuedAt));
  const savedAlertTrend = aggregateDailyTimestamps(savedAlertTrendRows.map(row => row.createdAt));
  const eventTotals = new Map(growthEvents.map(item => [item.event, Number(item.total)]));

  return {
    totals: { routeSearches: routeCount?.value ?? 0, redemptions: redemptionCount?.value ?? 0, pendingRedemptions: pendingCount?.value ?? 0, consentEvents: consentCount?.value ?? 0 },
    recentRoutes,
    recentRedemptions,
    topRoutes,
    growthEvents,
    conversionFunnel: conversionFunnelStages.map(stage => ({ ...stage, total: eventTotals.get(stage.event) ?? 0 })),
    invalidPageTokensByRegion: invalidPageTokensByRegion.map(item => ({ region: item.region || "Sem região", total: Number(item.total) })),
    paginationAlertThresholds,
    paginationAlertThresholdHistory,
    googleMapsWeeklyStability,
    weeklyTrend: buildWeeklyTrend(notificationTrend).map((day, index) => ({ ...day, savedAlerts: buildWeeklyTrend(savedAlertTrend)[index]?.total ?? 0 })),
    anpAuthorizedSync,
    providerMetrics,
  };
}
