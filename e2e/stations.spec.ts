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

test("postos: sincroniza busca da URL e expõe filtro de combustível", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });

  const fuel = page.getByRole("combobox", { name: "Filtrar por combustível" });
  await expect(fuel).toBeVisible();
  await fuel.selectOption("etanol");
  await expect(fuel).toHaveValue("etanol");

  const search = page.getByRole("textbox", { name: "Cidade, bairro ou posto" });
  await search.fill("Ceilândia");
  await page.getByRole("button", { name: "Pesquisar" }).click();
  await expect(page).toHaveURL(/q=Ceil%C3%A2ndia|q=Ceil%C3%A2ndia/);

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
