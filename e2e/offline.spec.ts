import { expect, test } from "@playwright/test";

test("postos: continua navegável depois de perder a conexão", async ({ page, context }) => {
  await page.goto("/postos?q=postos", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Postos", exact: true })).toBeVisible();
  await expect(page.getByText("Catálogo local", { exact: true })).toBeVisible();

  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.ready;
  });

  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 10_000, message: "O Service Worker precisa controlar a página antes do teste offline." },
  ).toBe(true);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Postos", exact: true })).toBeVisible();

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Postos", exact: true })).toBeVisible();
  await expect(page.getByText("Catálogo local", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /buscar posto, bairro ou endereço/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Filtros/ })).toBeVisible();
});
