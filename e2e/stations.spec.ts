import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("postos: abre, filtra e mantém a ficha navegável", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  await expect(page.getByText(/Diretório completo/i)).toBeVisible();

  const search = page.getByRole("textbox", { name: /filtrar diretório de postos/i });
  await search.fill("posto");
  await expect(page.locator('article[id^="posto-"]').first()).toBeVisible();
});

test("postos: cruza ANP no diretório e mantém filtro de combustível útil", async ({ page }) => {
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

test("postos: acessibilidade sem violações críticas", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .exclude("#aguas-lindas-map")
    .analyze();
  const blocking = results.violations.filter(item => item.impact === "critical" || item.impact === "serious");
  expect(blocking).toEqual([]);
});
