import { createHash } from "node:crypto";
import { z } from "zod";
import { createConsentEvent } from "../db";
import { publicProcedure, router } from "../_core/trpc";

const consentInput = z.object({
  purpose: z.enum(["sms_auth", "route_alerts", "location"]),
  accepted: z.boolean(),
  phone: z.string().min(10).max(24).optional(),
  policyVersion: z.string().trim().min(1).max(32).default("2026-08"),
});

export const consentRouter = router({
  record: publicProcedure.input(consentInput).mutation(async ({ ctx, input }) => {
    const digits = input.phone?.replace(/\D/g, "") ?? "";
    const phoneDigest = digits ? createHash("sha256").update(digits).digest("hex") : null;
    const phoneLast4 = digits ? digits.slice(-4) : null;
    await createConsentEvent({
      userId: ctx.user?.id ?? null,
      purpose: input.purpose,
      accepted: input.accepted,
      phoneDigest,
      phoneLast4,
      policyVersion: input.policyVersion,
    });
    return { recorded: true };
  }),
});
