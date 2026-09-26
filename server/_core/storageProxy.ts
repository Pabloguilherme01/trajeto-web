import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || key.length > 512 || /[\u0000-\u001F\u007F]/.test(key)) {
      res.status(400).send("Invalid storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
        signal: AbortSignal.timeout(15_000),
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const payload = (await forgeResp.json()) as { url?: unknown };
      if (typeof payload.url !== "string" || payload.url.length > 4096) {
        res.status(502).send("Invalid signed URL from backend");
        return;
      }
      let signedUrl: URL;
      try {
        signedUrl = new URL(payload.url);
      } catch {
        res.status(502).send("Invalid signed URL from backend");
        return;
      }
      if (signedUrl.protocol !== "https:") {
        res.status(502).send("Invalid signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, signedUrl.toString());
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
