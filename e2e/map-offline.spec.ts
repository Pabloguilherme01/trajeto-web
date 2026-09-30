import { expect, test } from "@playwright/test";

test("mapa: mantém estado legível sem conexão", async ({ page, context }) => {
  await page.goto("/mapa?q=hospital", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Águas Lindas", exact: true })).toBeVisible();

  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.ready;
  });

  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 10_000 },
  ).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Águas Lindas", exact: true })).toBeVisible();
  await expect(page.getByText(/offline|Mapa local/i).first()).toBeVisible();
});
