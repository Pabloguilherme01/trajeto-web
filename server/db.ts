import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { consentEvents, favoriteStations, fuelPriceSnapshots, InsertUser, productEvents, redemptions, routeAlertPreferences, routeSearches, socialLinks, trafficNotifications, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { favoriteStationValues, type FavoriteStationInput } from "./lib/favoriteStation";
import { normalizeRegion, type ProductEventName } from "./lib/productEvents";
import { aggregateDailyTimestamps, buildWeeklyTrend } from "./lib/weeklyTrends";

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

export async function createRouteSearch(input: {
  userId: number | null; origin: string; destination: string; originLat: number; originLng: number; destinationLat: number; destinationLng: number;
  distanceMeters: number; durationSeconds: number; routeSummary: string | null; overviewPolyline: string | null; locationConsent: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(routeSearches).values({
    ...input,
    originLat: String(input.originLat), originLng: String(input.originLng), destinationLat: String(input.destinationLat), destinationLng: String(input.destinationLng),
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
  await db.insert(routeAlertPreferences).values({ userId, ...input }).onDuplicateKeyUpdate({ set: { corridorLabel: input.corridorLabel, timeSlot: input.timeSlot, active: input.active } });
  return { saved: true };
}

export async function removeRouteAlertPreference(userId: number, corridorId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.delete(routeAlertPreferences).where(and(eq(routeAlertPreferences.userId, userId), eq(routeAlertPreferences.corridorId, corridorId)));
  return { removed: true };
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

export async function getOperationalOverview() {
  const db = await getDb();
  if (!db) return { totals: { routeSearches: 0, redemptions: 0, pendingRedemptions: 0, consentEvents: 0 }, recentRoutes: [], recentRedemptions: [], topRoutes: [], growthEvents: [], weeklyTrend: buildWeeklyTrend([]).map(day => ({ ...day, savedAlerts: 0 })) };

  const [[routeCount], [redemptionCount], [pendingCount], [consentCount], recentRoutes, recentRedemptions, topRoutes, growthEvents, notificationTrendRows, savedAlertTrendRows] = await Promise.all([
    db.select({ value: count() }).from(routeSearches),
    db.select({ value: count() }).from(redemptions),
    db.select({ value: count() }).from(redemptions).where(eq(redemptions.status, "requested")),
    db.select({ value: count() }).from(consentEvents),
    db.select().from(routeSearches).orderBy(desc(routeSearches.createdAt)).limit(8),
    db.select().from(redemptions).orderBy(desc(redemptions.requestedAt)).limit(8),
    db.select({ origin: routeSearches.origin, destination: routeSearches.destination, consultations: sql<number>`count(*)` }).from(routeSearches).groupBy(routeSearches.origin, routeSearches.destination).orderBy(desc(sql`count(*)`)).limit(6),
    db.select({ event: productEvents.event, total: count() }).from(productEvents).groupBy(productEvents.event),
    db.select({ issuedAt: trafficNotifications.issuedAt }).from(trafficNotifications),
    db.select({ createdAt: productEvents.createdAt }).from(productEvents).where(eq(productEvents.event, "alert_preference_saved")),
  ]);

  const notificationTrend = aggregateDailyTimestamps(notificationTrendRows.map(row => row.issuedAt));
  const savedAlertTrend = aggregateDailyTimestamps(savedAlertTrendRows.map(row => row.createdAt));

  return {
    totals: { routeSearches: routeCount?.value ?? 0, redemptions: redemptionCount?.value ?? 0, pendingRedemptions: pendingCount?.value ?? 0, consentEvents: consentCount?.value ?? 0 },
    recentRoutes,
    recentRedemptions,
    topRoutes,
    growthEvents,
    weeklyTrend: buildWeeklyTrend(notificationTrend).map((day, index) => ({ ...day, savedAlerts: buildWeeklyTrend(savedAlertTrend)[index]?.total ?? 0 })),
  };
}
