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
  await expect(page.getByRole("heading", { name: /Use o Trajeto em poucos passos/i })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /Encontre e vá/i })).toBeVisible();
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

test("Pages: public filters survive category changes, reload and back navigation", async ({ page }) => {
  await page.goto("servicos", { waitUntil: "domcontentloaded" });
  const search = page.getByRole("textbox", { name: "Buscar serviços públicos" });
  await search.fill("informacao cidadao");
  await page.getByRole("button", { name: "Cidadania", exact: true }).click();
  await expect(search).toHaveValue("informacao cidadao");
  await expect(page.getByRole("heading", { name: "Serviço de Informação ao Cidadão · SIC" })).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(search).toHaveValue("informacao cidadao");
  await page.getByRole("button", { name: "Saúde", exact: true }).click();
  await expect(page.getByText("Nenhum serviço corresponde ao filtro.")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("button", { name: "Cidadania", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(search).toHaveValue("informacao cidadao");
});

test("Pages: first visit prepares unvisited public screens for offline use", async ({ page, context }) => {
  await page.goto("", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await context.setOffline(true);
  for (const [path, title] of [
    ["servicos", "Águas Lindas em um só lugar."],
    ["buscar", "Encontre e vá."],
    ["salvos", "Rotas salvas"],
    ["ajuda", "Use o Trajeto em poucos passos."],
    ["mapa", "Encontre uma parada"],
  ]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: new RegExp(title) }).first()).toBeVisible();
    if (path === "ajuda") await expect(page.getByText("Pronto para usar sem internet neste aparelho.")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("Pages: More stays usable on a small mobile viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "pages-mobile", "Mobile drawer ergonomics");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Mais opções" }).click();
  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  await dialog.getByRole("button", { name: "Ajuda e offline" }).click();
  await expect(page).toHaveURL(/\/trajeto-web\/ajuda$/);
  await expect(dialog).not.toBeVisible();
});
