import { z } from "zod";
import { addFavoriteStation, createConsentEvent, createProductEvent, createTrafficNotifications, createUserVehicle, deleteUserVehicle, getFavoritePlaceIds, getPersonalOverview, getRouteAlertPreferences, getStationSearchPreferences, getTrafficNotifications, getUserVehicles, markTrafficNotificationsRead, removeFavoriteStation, removeRouteAlertPreference, updateUserVehicle, upsertRouteAlertPreference, upsertStationSearchPreferences } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { calculateFuelEconomy } from "../lib/fuelEconomy";
import { getAlertCorridor, isSlotActiveNow } from "../lib/alertCorridors";
import { filterIncidentsByMinimumDelay, routeTrafficStatus } from "../lib/routeTraffic";

const stationInput = z.object({
  placeId: z.string().trim().min(1).max(255),
  stationName: z.string().trim().min(1).max(255),
  stationAddress: z.string().trim().min(1).max(500),
  lat: z.number().finite().gte(-90).lte(90),
  lng: z.number().finite().gte(-180).lte(180),
});

const alertInput = z.object({
  corridorId: z.string().trim().min(2).max(80),
  corridorLabel: z.string().trim().min(2).max(120),
  timeSlot: z.enum(["morning", "afternoon", "evening", "anytime"]),
  minimumDelayMinutes: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15), z.literal(30)]).default(0),
  active: z.boolean().default(true),
  consent: z.literal(true),
});

const stationSearchPreferencesInput = z.object({
  mappedBrand: z.string().trim().min(1).max(120).default("all"),
  hoursStatus: z.enum(["all", "open", "closed", "unknown"]).default("all"),
  sortBy: z.enum(["distance", "relevance", "brand", "hours"]).default("distance"),
  anpNeighborhood: z.string().trim().min(1).max(160).default("all"),
  anpBrand: z.string().trim().min(1).max(120).default("all"),
});

const vehicleInput = z.object({
  nickname: z.string().trim().min(2).max(80), brand: z.string().trim().max(80).optional().nullable(), model: z.string().trim().max(120).optional().nullable(), version: z.string().trim().max(120).optional().nullable(), year: z.number().int().gte(1900).lte(new Date().getFullYear() + 1).optional().nullable(),
  fuelType: z.enum(["gasoline", "ethanol", "flex", "diesel", "gnv", "electric", "other"]).default("flex"),
  tankLiters: z.number().positive().lte(500).optional().nullable(), cityKmPerLiter: z.number().positive().lte(100).optional().nullable(), highwayKmPerLiter: z.number().positive().lte(100).optional().nullable(), customKmPerLiter: z.number().positive().lte(100).optional().nullable(), notes: z.string().trim().max(1000).optional().nullable(),
});
const fuelEconomyInput = z.object({ distanceKm: z.number().finite().gte(0).lte(20_000), pricePerLiter: z.number().finite().positive().lte(100), kmPerLiter: z.number().finite().positive().lte(100), tankLiters: z.number().finite().positive().lte(500).optional().nullable() });

export const personalRouter = router({
  overview: protectedProcedure.query(({ ctx }) => getPersonalOverview(ctx.user.id)),
  liveAlerts: protectedProcedure.query(async ({ ctx }) => {
    const preferences = await getRouteAlertPreferences(ctx.user.id);
    const active = preferences.filter(preference => preference.active).slice(0, 4);
    const alerts = await Promise.all(active.map(async preference => {
      const corridor = getAlertCorridor(preference.corridorId);
      if (!corridor) return { corridorId: preference.corridorId, corridorLabel: preference.corridorLabel, timeSlot: preference.timeSlot, inWindow: false, traffic: null };
      const traffic = await routeTrafficStatus(corridor.point, corridor.point);
      const incidents = traffic.state === "active" ? filterIncidentsByMinimumDelay(traffic.incidents, preference.minimumDelayMinutes) : traffic.incidents;
      return { corridorId: preference.corridorId, corridorLabel: preference.corridorLabel, timeSlot: preference.timeSlot, minimumDelayMinutes: preference.minimumDelayMinutes, inWindow: isSlotActiveNow(preference.timeSlot), traffic: { ...traffic, incidents, label: traffic.state === "active" ? (incidents.length ? `${incidents.length} ocorrência(s) acima do limite selecionado` : "Nenhuma ocorrência acima do limite selecionado") : traffic.label } };
    }));
    const notificationInputs = alerts.flatMap(alert => alert.inWindow && alert.traffic?.state === "active" ? alert.traffic.incidents.map(incident => ({
      userId: ctx.user.id,
      corridorId: alert.corridorId,
      corridorLabel: alert.corridorLabel,
      incidentId: incident.id,
      title: `${alert.corridorLabel}: atenção na rota`,
      detail: incident.description,
      severity: incident.severity,
    })) : []);
    const newNotifications = await createTrafficNotifications(notificationInputs);
    const notifications = await getTrafficNotifications(ctx.user.id);
    return { checkedAt: new Date(), alerts, notifications, newNotifications };
  }),
  trafficNotifications: protectedProcedure.query(({ ctx }) => getTrafficNotifications(ctx.user.id)),
  markTrafficNotificationsRead: protectedProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(12) })).mutation(({ ctx, input }) => markTrafficNotificationsRead(ctx.user.id, input.ids)),
  favoriteState: protectedProcedure.input(z.object({ placeIds: z.array(z.string().min(1).max(255)).max(100) })).query(({ ctx, input }) => getFavoritePlaceIds(ctx.user.id, input.placeIds)),
  stationSearchPreferences: protectedProcedure.query(({ ctx }) => getStationSearchPreferences(ctx.user.id)),
  saveStationSearchPreferences: protectedProcedure.input(stationSearchPreferencesInput).mutation(({ ctx, input }) => upsertStationSearchPreferences(ctx.user.id, input)),
  vehicles: protectedProcedure.query(({ ctx }) => getUserVehicles(ctx.user.id)),
  createVehicle: protectedProcedure.input(vehicleInput).mutation(({ ctx, input }) => createUserVehicle(ctx.user.id, input)),
  updateVehicle: protectedProcedure.input(vehicleInput.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => updateUserVehicle(ctx.user.id, input.id, input)),
  deleteVehicle: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteUserVehicle(ctx.user.id, input.id)),
  fuelEconomy: protectedProcedure.input(fuelEconomyInput).query(({ input }) => calculateFuelEconomy(input)),
  addFavorite: protectedProcedure.input(stationInput).mutation(({ ctx, input }) => addFavoriteStation(ctx.user.id, input)),
  removeFavorite: protectedProcedure.input(z.object({ placeId: z.string().trim().min(1).max(255) })).mutation(({ ctx, input }) => removeFavoriteStation(ctx.user.id, input.placeId)),
  saveRouteAlert: protectedProcedure.input(alertInput).mutation(async ({ ctx, input }) => {
    await upsertRouteAlertPreference(ctx.user.id, input);
    await createConsentEvent({ userId: ctx.user.id, purpose: "route_alerts", accepted: true, phoneDigest: null, phoneLast4: null, policyVersion: "2026-08" });
    await createProductEvent({ event: "alert_preference_saved", region: input.corridorLabel });
    return { saved: true };
  }),
  removeRouteAlert: protectedProcedure.input(z.object({ corridorId: z.string().trim().min(2).max(80) })).mutation(({ ctx, input }) => removeRouteAlertPreference(ctx.user.id, input.corridorId)),
});
