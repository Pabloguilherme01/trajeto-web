import { z } from "zod";
import { createProductEvent } from "../db";
import { productEventNames } from "../lib/productEvents";
import { publicProcedure, router } from "../_core/trpc";

export const analyticsRouter = router({
  track: publicProcedure.input(z.object({ event: z.enum(productEventNames), region: z.string().trim().max(120).nullable().optional() })).mutation(async ({ input }) => {
    await createProductEvent(input);
    return { accepted: true };
  }),
});
