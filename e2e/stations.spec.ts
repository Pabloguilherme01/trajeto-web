import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("postos: abre, filtra e mantém a ficha navegável", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  await expect(page.getByText(/Diretório completo/i)).toBeVisible();

  const search = page.getByRole("textbox", { name: /^Buscar postos$/i });
  await search.fill("posto");
  await search.press("Enter");
  await expect(page.locator('article[id^="posto-"]').first()).toBeVisible();
});

test.describe("postos: disponibilidade de preços ANP", () => {
  // These fixtures cover both outcomes independently of weekly data updates.
  test.use({ serviceWorkers: "block" });

test("postos: cruza ANP no diretório e mantém filtro de combustível útil", async ({ page }) => {
  await page.route("**/data/aguas-lindas-anp-precos.json", route => route.fulfill({
    json: { source: "ANP", sourceUrl: "https://www.gov.br/anp/", retrievedAt: "2026-10-09T00:00:00Z", referencePeriod: "27/09/2026 a 03/10/2026", totalRows: 0, totalStations: 0, data: [], warning: "Nenhum registro municipal reconhecido." },
  }));
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });

  const fuel = page.getByRole("combobox", { name: "Filtrar por combustível" });
  const sort = page.getByRole("combobox", { name: "Ordenar diretório de postos" });
  await expect(fuel).toBeVisible();
  await expect(sort.locator('option[value="distance"]')).toBeDisabled();
  await expect(sort.locator('option[value="price"]')).toBeDisabled();
  await expect(page.getByText(/ordenação por preço desativada/i)).toBeVisible();

  await fuel.selectOption("etanol");
  await expect(fuel).toHaveValue("etanol");
  await expect(page.locator('article[id^="posto-"]').first()).toBeVisible();
  await expect(page.getByText("Nenhum posto encontrado com esses filtros.")).toHaveCount(0);

  const search = page.getByRole("textbox", { name: "Buscar postos" });
  await search.fill("Ceilândia");
  await page.getByRole("button", { name: "Buscar postos", exact: true }).click();
  await expect(page).toHaveURL(/[?&]q=Ceil%C3%A2ndia/);

  await page.goBack();
  await expect(search).toHaveValue("postos");
});

test("postos: habilita ordenação quando há preço municipal individual", async ({ page }) => {
  await page.route("**/data/aguas-lindas-anp-precos.json", route => route.fulfill({
    json: {
      source: "ANP", sourceUrl: "https://www.gov.br/anp/", retrievedAt: "2026-10-09T00:00:00Z", referencePeriod: "27/09/2026 a 03/10/2026", totalRows: 1, totalStations: 1,
      data: [{ cnpj: "02316635000128", razaoSocial: "AUTO POSTO JARDIM BRASILIA LTDA", endereco: "AVENIDA JK", bairro: "JARDIM BRASILIA", municipio: "AGUAS LINDAS DE GOIAS", uf: "GO", produto: "GASOLINA COMUM", productKey: "gasolina-comum", salePrice: 6.79, unit: "L", collectionDate: "2026-09-28", referencePeriod: "27/09/2026 a 03/10/2026", source: "ANP" }],
    },
  }));
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  const sort = page.getByRole("combobox", { name: "Ordenar diretório de postos" });
  await expect(sort.locator('option[value="price"]')).toBeEnabled();
  await sort.selectOption("price");
  await expect(sort).toHaveValue("price");
  await expect(page.getByText(/ordenação por preço desativada/i)).toHaveCount(0);
  await expect(page.locator('article[id^="posto-"]').first()).toContainText(/6,79/);
});
});

test("postos: acessibilidade sem violações críticas", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .exclude("#aguas-lindas-map")
    .analyze();
  const blocking = results.violations.filter(item => item.impact === "critical" || item.impact === "serious");
  expect(blocking).toEqual([]);
});
