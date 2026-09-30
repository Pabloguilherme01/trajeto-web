import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("postos: abre, filtra e mantém a ficha navegável", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  await expect(page.getByText(/Diretório completo/i)).toBeVisible();

  const search = page.getByRole("textbox", { name: /filtrar diretório de postos/i });
  await search.fill("Pérola");
  await expect(page.getByText(/Auto Posto Pérola/i).first()).toBeVisible();
});

test("postos: acessibilidade sem violações críticas", async ({ page }) => {
  await page.goto("/postos?q=postos", { waitUntil: "domcontentloaded" });
  const results = await new AxeBuilder({ page })
    .exclude("#aguas-lindas-map")
    .analyze();
  expect(results.violations).toEqual([]);
});

test("postos: shell navega em offline após carregar", async ({ page, context }) => {
  await page.goto("/postos?q=postos", { waitUntil: "networkidle" });
  await page.waitForFunction(() => "serviceWorker" in navigator);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(/offline|cache local/i).first()).toBeVisible();
});
