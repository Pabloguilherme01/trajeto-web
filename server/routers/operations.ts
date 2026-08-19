import { z } from "zod";
import { acknowledgeOperationalAlert, createRedemption, evaluateGooglePaginationOperationalAlerts, getOperationalAlerts, getOperationalOverview, getPaginationAlertThresholdHistory, recordAnpSyncRun, replaceAnpPriceSnapshots, replaceAuthorizedStations, upsertPaginationAlertThreshold } from "../db";
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
  paginationAlertHistory: adminProcedure.input(z.object({ region: z.string().trim().max(120).optional(), startAt: z.date().optional(), endAt: z.date().optional(), limit: z.number().int().min(1).max(100).default(24), offset: z.number().int().min(0).max(10_000).default(0) })).query(({ input }) => getPaginationAlertThresholdHistory(input)),
  operationalAlerts: adminProcedure.input(z.object({ status: z.enum(["active", "acknowledged", "resolved"]).optional() }).default({})).query(({ input }) => getOperationalAlerts(input.status)),
  refreshOperationalAlerts: adminProcedure.mutation(() => evaluateGooglePaginationOperationalAlerts()),
  acknowledgeOperationalAlert: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => acknowledgeOperationalAlert(input.id, ctx.user.id)),
  savePaginationAlertThreshold: adminProcedure.input(z.object({ region: z.string().trim().min(2).max(120), threshold: z.number().int().min(1).max(100) })).mutation(({ ctx, input }) => upsertPaginationAlertThreshold({ ...input, changedByUserId: ctx.user.id })),
  syncAnp: adminProcedure.input(z.object({ sourceUrl: z.string().url().default(DEFAULT_ANP_SOURCE_URL) })).mutation(async ({ input }) => {
    try {
      const rows = await downloadAndParseAnp(input.sourceUrl);
      const result = await replaceAnpPriceSnapshots(input.sourceUrl, rows);
      await recordAnpSyncRun({ dataset: "price_references", status: "updated", sourceUrl: input.sourceUrl, attempts: 1, imported: result.imported });
      return { status: "updated" as const, ...result, sourceUrl: input.sourceUrl };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro de origem desconhecida.";
      await recordAnpSyncRun({ dataset: "price_references", status: "failed", sourceUrl: input.sourceUrl, attempts: 1, imported: 0, message: detail });
      throw error;
    }
  }),
  syncAuthorizedStations: adminProcedure.input(z.object({ sourceUrl: z.string().url().default(DEFAULT_ANP_AUTHORIZED_STATIONS_URL) })).mutation(async ({ input }) => {
    try {
      const { stations, queriedAt, attempts } = await downloadAuthorizedStations(input.sourceUrl);
      const result = await replaceAuthorizedStations(stations);
      await recordAnpSyncRun({ dataset: "authorized_stations", status: "updated", sourceUrl: input.sourceUrl, attempts, imported: result.imported });
      return { status: "updated" as const, ...result, sourceUrl: input.sourceUrl, queriedAt };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro de origem desconhecida.";
      await recordAnpSyncRun({ dataset: "authorized_stations", status: "fallback", sourceUrl: input.sourceUrl, attempts: 3, imported: 0, message: detail });
      return { status: "fallback" as const, imported: 0, sourceUrl: input.sourceUrl, queriedAt: null, message: `A fonte oficial não respondeu após tentativas limitadas. O catálogo já armazenado foi preservado. Detalhe: ${detail}` };
    }
  }),
});
