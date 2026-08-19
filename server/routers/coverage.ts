import { getPublicCoverage } from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const coverageRouter = router({
  overview: publicProcedure.query(() => getPublicCoverage()),
});
