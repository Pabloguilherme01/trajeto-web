import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("postos: abre, busca, filtra e mantém a ficha utilizável", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Postos", exact: true })).toBeVisible();
  await expect(page.getByText("Catálogo local", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mapa", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Filtros/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Conta", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Conta", exact: true })).toHaveCount(0);

  const search = page.getByRole("textbox", { name: /buscar posto, bairro ou endereço/i });
  await search.fill("posto");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Resultados", exact: true })).toBeVisible();
  await expect(page.locator('article[id^="posto-"]').first()).toBeVisible();
});

test("postos: filtro abre como bottom sheet e pode ser limpo", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await expect(page.getByRole("dialog", { name: /Filtros/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gasolina", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Limpar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Filtros/i })).toHaveCount(0);
});

test("postos: acessibilidade sem violações críticas", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  const results = await new AxeBuilder({ page })
    .exclude("#station-results-map")
    .exclude("#aguas-lindas-map")
    .analyze();
  const blocking = results.violations.filter(item => item.impact === "critical" || item.impact === "serious");
  expect(blocking).toEqual([]);
});
