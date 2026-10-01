import { z } from "zod";
import { createProductEvent } from "../db";
import { productEventNames, productEventRegion } from "../lib/productEvents";
import { publicProcedure, router } from "../_core/trpc";

export const analyticsRouter = router({
  track: publicProcedure.input(z.object({ event: z.enum(productEventNames), region: z.string().trim().max(120).nullable().optional() })).mutation(async ({ input }) => {
    await createProductEvent({ event: input.event, region: productEventRegion(input.event, input.region) });
    return { accepted: true };
  }),
});
