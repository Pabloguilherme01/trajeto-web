import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("postos: abre, filtra e mantém a ficha navegável", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  await expect(page.getByText(/Diretório completo/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Conta", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Conta", exact: true })).toHaveCount(0);

  const search = page.getByRole("textbox", { name: /filtrar diretório de postos/i });
  await search.fill("posto");
  await expect(page.locator('article[id^="posto-"]').first()).toBeVisible();
});

test("postos: acessibilidade sem violações críticas", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  const results = await new AxeBuilder({ page })
    .exclude("#aguas-lindas-map")
    .analyze();
  const blocking = results.violations.filter(item => item.impact === "critical" || item.impact === "serious");
  expect(blocking).toEqual([]);
});
