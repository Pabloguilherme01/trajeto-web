import { z } from "zod";
import { createRedemption, getOperationalOverview, replaceAnpPriceSnapshots, replaceAuthorizedStations } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { DEFAULT_ANP_SOURCE_URL, downloadAndParseAnp } from "../lib/anpImport";
import { DEFAULT_ANP_AUTHORIZED_STATIONS_URL, downloadAuthorizedStations } from "../lib/anpAuthorizedStations";

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
  syncAuthorizedStations: adminProcedure.input(z.object({ sourceUrl: z.string().url().default(DEFAULT_ANP_AUTHORIZED_STATIONS_URL) })).mutation(async ({ input }) => {
    try {
      const { stations, queriedAt } = await downloadAuthorizedStations(input.sourceUrl);
      const result = await replaceAuthorizedStations(stations);
      return { status: "updated" as const, ...result, sourceUrl: input.sourceUrl, queriedAt };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro de origem desconhecida.";
      return { status: "fallback" as const, imported: 0, sourceUrl: input.sourceUrl, queriedAt: null, message: `A fonte oficial não respondeu após tentativas limitadas. O catálogo já armazenado foi preservado. Detalhe: ${detail}` };
    }
  }),
});
