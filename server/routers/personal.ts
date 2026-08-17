import { z } from "zod";
import { addFavoriteStation, getFavoritePlaceIds, getPersonalOverview, removeFavoriteStation } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const stationInput = z.object({
  placeId: z.string().trim().min(1).max(255),
  stationName: z.string().trim().min(1).max(255),
  stationAddress: z.string().trim().min(1).max(500),
  lat: z.number().finite().gte(-90).lte(90),
  lng: z.number().finite().gte(-180).lte(180),
});

export const personalRouter = router({
  overview: protectedProcedure.query(({ ctx }) => getPersonalOverview(ctx.user.id)),
  favoriteState: protectedProcedure.input(z.object({ placeIds: z.array(z.string().min(1).max(255)).max(12) })).query(({ ctx, input }) => getFavoritePlaceIds(ctx.user.id, input.placeIds)),
  addFavorite: protectedProcedure.input(stationInput).mutation(({ ctx, input }) => addFavoriteStation(ctx.user.id, input)),
  removeFavorite: protectedProcedure.input(z.object({ placeId: z.string().trim().min(1).max(255) })).mutation(({ ctx, input }) => removeFavoriteStation(ctx.user.id, input.placeId)),
});
