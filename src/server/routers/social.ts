import { z } from "zod";
import { getPublicSocialLinks, getSocialLinks, upsertSocialLinks } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { withWhatsAppFirstContactMessage } from "../lib/socialLinks";

const platform = z.enum(["instagram", "whatsapp", "tiktok", "youtube"]);
const url = z.string().trim().url().max(500).refine(value => new URL(value).protocol === "https:", "Use um link HTTPS válido.");

export const socialRouter = router({
  publicLinks: publicProcedure.query(() => getPublicSocialLinks()),
  all: adminProcedure.query(() => getSocialLinks()),
  save: adminProcedure.input(z.object({ links: z.array(z.object({ platform, url: url.nullable(), active: z.boolean() })).min(1).max(4) })).mutation(async ({ input }) => {
    await upsertSocialLinks(input.links.map(link => ({ ...link, url: withWhatsAppFirstContactMessage(link.platform, link.url) })));
    return { saved: true };
  }),
});
