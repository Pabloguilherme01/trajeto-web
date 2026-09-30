import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("mapa: abre como explorador territorial mobile-first", async ({ page }) => {
  await page.goto("/mapa", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Águas Lindas", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /o que você procura/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tudo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Postos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saúde", exact: true })).toBeVisible();
  await expect(page.getByText(/Como ler o mapa/i)).toBeVisible();
});

test("mapa: acessibilidade sem violações críticas no shell", async ({ page }) => {
  await page.goto("/mapa", { waitUntil: "domcontentloaded" });
  const results = await new AxeBuilder({ page })
    .exclude("canvas")
    .analyze();
  const blocking = results.violations.filter(item => item.impact === "critical" || item.impact === "serious");
  expect(blocking).toEqual([]);
});
