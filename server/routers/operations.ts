import { z } from "zod";
import { createRedemption, getOperationalOverview, replaceAnpPriceSnapshots } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { DEFAULT_ANP_SOURCE_URL, downloadAndParseAnp } from "../lib/anpImport";

export const operationsRouter = router({
  requestRedemption: protectedProcedure.input(z.object({
    routeSearchId: z.number().int().positive(),
    placeId: z.string().min(1).max(255),
    stationName: z.string().min(1).max(255),
    stationAddress: z.string().min(1).max(500),
  })).mutation(async ({ ctx, input }) => createRedemption({ ...input, userId: ctx.user.id })),
  overview: adminProcedure.query(async () => getOperationalOverview()),
  syncAnp: adminProcedure.input(z.object({ sourceUrl: z.string().url().default(DEFAULT_ANP_SOURCE_URL) })).mutation(async ({ input }) => {
    const rows = await downloadAndParseAnp(input.sourceUrl);
    const result = await replaceAnpPriceSnapshots(input.sourceUrl, rows);
    return { ...result, sourceUrl: input.sourceUrl };
  }),
});
