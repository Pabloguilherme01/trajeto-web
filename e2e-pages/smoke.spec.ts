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

test("Pages: mapa e ficha local funcionam como recursos independentes", async ({ page }) => {
  await page.goto("mapa", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  await expect(page.locator("#aguas-lindas-map")).toBeVisible();

  await page.goto("local/rham", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Rham Auto Posto", exact: true })).toBeVisible();
  await expect(page.getByText("Ficha completa")).toBeVisible();
  await expect(page.getByRole("button", { name: "Compartilhar" })).toBeVisible();
});


test("Pages: busca universal encontra um local e abre a ficha", async ({ page }) => {
  await page.goto("buscar", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre o que precisa/i })).toBeVisible();
  const input = page.getByRole("textbox", { name: /Buscar locais/i });
  await input.fill("Rham");
  await page.getByRole("button", { name: "Pesquisar" }).click();
  await expect(page.getByText("Rham Auto Posto", { exact: true })).toBeVisible();
  await page.getByText("Rham Auto Posto", { exact: true }).click();
  await expect(page).toHaveURL(/\/trajeto-web\/local\/rham$/);
  await expect(page.getByText("Ficha completa")).toBeVisible();
});

test("Pages: modos de rota ficam disponíveis sem backend", async ({ page }) => {
  await page.route("https://router.project-osrm.org/**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "Ok", routes: [{ distance: 2500, duration: 600, geometry: "abc" }] }),
  }));
  await page.goto("planejar?origem=-15.7545,-48.2816&destino=-15.7700,-48.2700", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /A pé/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Bicicleta/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Transporte/i })).toBeVisible();
  await page.getByRole("button", { name: /A pé/i }).click();
  await page.getByRole("button", { name: "Calcular rota" }).click();
  await expect(page.getByText("2,5 km")).toBeVisible();
});
