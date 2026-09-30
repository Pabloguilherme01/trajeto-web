test("Pages: cliques principais funcionam dentro da base hospedada", async ({ page }) => {
  await page.goto("", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Chegue melhor/i })).toBeVisible();

  await page.getByRole("button", { name: /Planejar uma rota/i }).click();
  await expect(page).toHaveURL(/\/trajeto-web\/planejar$/);
  await expect(page.getByRole("heading", { name: /Sua próxima saída/i })).toBeVisible();

  await page.getByRole("link", { name: "Postos" }).click();
  await expect(page).toHaveURL(/\/trajeto-web\/postos/);
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();

  await page.getByRole("link", { name: "Salvos" }).click();
  await expect(page).toHaveURL(/\/trajeto-web\/salvos$/);
  await expect(page.getByRole("heading", { name: /Rotas salvas/i })).toBeVisible();

  await page.getByRole("link", { name: "Início" }).click();
  await expect(page).toHaveURL(/\/trajeto-web\/$/);
});

import { expect, test } from "@playwright/test";

test("Pages: abre a home e navega entre os fluxos públicos", async ({ page }) => {
  await page.goto("", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Chegue melhor/i })).toBeVisible();
  await page.goto("postos?q=postos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  await page.goto("salvos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Rotas salvas/i })).toBeVisible();
  await page.goto("ajuda", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Ajuda/i })).toBeVisible();
});

test("Pages: planejador público funciona com a base /trajeto-web/", async ({ page }) => {
  await page.route("https://router.project-osrm.org/**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "Ok", routes: [{ distance: 12340, duration: 920, geometry: "r`d_B~~teHbwFg_mA" }] }),
  }));
  await page.goto("planejar?origem=-15.7545,-48.2816&destino=-15.7942,-47.8822", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Calcular rota" }).click();
  await expect(page.getByText("12,3 km")).toBeVisible();
  await expect(page.getByText("15 min")).toBeVisible();
  await expect(page.getByRole("button", { name: "Google Maps" })).toBeVisible();
  const currentUrl = new URL(page.url());
  expect(currentUrl.pathname).toBe("/trajeto-web/planejar");
  expect(currentUrl.search).toContain("origem=");
  expect(currentUrl.search).toContain("destino=");
});
