import { expect, test } from "@playwright/test";

test("Pages: fresh installation defers businesses until explicit complete preparation", async ({ page, context }) => {
  test.setTimeout(90000);
  await page.goto("ajuda");
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 60000 }).toBe(true);
  const businessCacheCoverage = () => page.evaluate(async () => {
    const key = (await caches.keys()).find(key => key.endsWith("-static"))!;
    const cache = await caches.open(key);
    const manifest = await (await cache.match("/trajeto-web/offline-assets.json"))!.json();
    const files = Object.values(manifest).filter((entry: any) => /^src\/data\/businesses\/part-/.test(entry.src || "")).map((entry: any) => "/trajeto-web/" + entry.file);
    const saved = await Promise.all(files.map(file => cache.match(file)));
    return { total: files.length, saved: saved.filter(Boolean).length };
  });
  expect(await businessCacheCoverage()).toEqual({ total: 38, saved: 0 });
  await expect(page.getByText(/Catálogo de empresas ainda não preparado/)).toBeVisible();
  await page.getByRole("button", { name: "Preparar acesso offline", exact: true }).click();
  await expect(page.getByText("Pronto para usar sem internet neste aparelho.")).toBeVisible({ timeout: 65000 });
  expect(await businessCacheCoverage()).toEqual({ total: 38, saved: 38 });
  await expect(page.getByText("Catálogo de empresas disponível offline neste aparelho.")).toBeVisible();
  await context.setOffline(true);
  await page.goto("mapa");
  await expect(page.getByText(/21\.486 empresas do arquivo/)).toBeVisible();
});
