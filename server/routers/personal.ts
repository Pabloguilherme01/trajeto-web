import { z } from "zod";
import { addFavoriteStation, createConsentEvent, createProductEvent, getFavoritePlaceIds, getPersonalOverview, getRouteAlertPreferences, removeFavoriteStation, removeRouteAlertPreference, upsertRouteAlertPreference } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { getAlertCorridor, isSlotActiveNow } from "../lib/alertCorridors";
import { routeTrafficStatus } from "../lib/routeTraffic";

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
  active: z.boolean().default(true),
  consent: z.literal(true),
});

export const personalRouter = router({
  overview: protectedProcedure.query(({ ctx }) => getPersonalOverview(ctx.user.id)),
  liveAlerts: protectedProcedure.query(async ({ ctx }) => {
    const preferences = await getRouteAlertPreferences(ctx.user.id);
    const active = preferences.filter(preference => preference.active).slice(0, 4);
    const alerts = await Promise.all(active.map(async preference => {
      const corridor = getAlertCorridor(preference.corridorId);
      if (!corridor) return { corridorId: preference.corridorId, corridorLabel: preference.corridorLabel, timeSlot: preference.timeSlot, inWindow: false, traffic: null };
      const traffic = await routeTrafficStatus(corridor.point, corridor.point);
      return { corridorId: preference.corridorId, corridorLabel: preference.corridorLabel, timeSlot: preference.timeSlot, inWindow: isSlotActiveNow(preference.timeSlot), traffic };
    }));
    return { checkedAt: new Date(), alerts };
  }),
  favoriteState: protectedProcedure.input(z.object({ placeIds: z.array(z.string().min(1).max(255)).max(12) })).query(({ ctx, input }) => getFavoritePlaceIds(ctx.user.id, input.placeIds)),
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
