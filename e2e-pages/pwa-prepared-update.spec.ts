import { expect, test } from "@playwright/test";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

test("Pages: a prepared map and atlas remain available after a real worker update and offline reload", async ({ page, context }, testInfo) => {
  test.setTimeout(90000);
  await page.goto("ajuda");
  await page.getByRole("button", { name: "Preparar acesso offline", exact: true }).click();
  await expect(page.getByText("Pronto para usar sem internet neste aparelho.")).toBeVisible({ timeout: 65000 });
  const before = await page.evaluate(async () => (await caches.keys()).filter(key => key.endsWith("-data")));
  const name = `sw-update-${testInfo.project.name.replace(/[^a-z0-9-]/gi, "")}.js`;
  const file = path.resolve("dist/public", name);
  const source = await readFile(path.resolve("dist/public/sw.js"), "utf8");
  await writeFile(file, source.replace(/CACHE_PREFIX \+ "([^"]+)"/, 'CACHE_PREFIX + "$1-prepared-update-test"'));
  try {
    await page.evaluate(async script => {
      const registration = await navigator.serviceWorker.register(script, { scope: "/trajeto-web/", updateViaCache: "none" });
      if (!registration.waiting) {
        const installing = registration.installing;
        if (!installing) throw new Error("Updated worker did not start");
        await new Promise<void>((resolve, reject) => {
          const changed = () => {
            if (installing.state === "installed") resolve();
            if (installing.state === "redundant") reject(new Error("Updated worker failed"));
          };
          installing.addEventListener("statechange", changed);
          changed();
        });
      }
      const controlled = new Promise<void>(resolve => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
      registration.waiting!.postMessage({ type: "SKIP_WAITING" });
      await controlled;
    }, `/trajeto-web/${name}`);
    await expect.poll(() => page.evaluate(async previous => {
      const keys = await caches.keys();
      return previous.every(key => !keys.includes(key));
    }, before)).toBe(true);
    await context.setOffline(true);
    await page.goto("mapa");
    await expect(page.getByText(/Ruas locais disponíveis/)).toBeVisible();
    await expect(page.getByRole("img", { name: /Mapa offline vetorial/ })).toBeVisible();
    const snapshots = await page.evaluate(async () => {
      const key = (await caches.keys()).find(key => key.endsWith("-data"))!;
      const cache = await caches.open(key);
      return Promise.all(["aguas-lindas-offline-map.json", "aguas-lindas-city-atlas.json"].map(async name => Boolean(await cache.match(`/trajeto-web/data/${name}`))));
    });
    expect(snapshots).toEqual([true, true]);
  } finally { await unlink(file); }
});
