import { expect, test } from "@playwright/test";

test("calculates a ready fuel trip offline and explores its map at 320px", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  const external: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("https://**/*", route => {
    external.push(route.request().url());
    return route.abort();
  });
  await page.goto("planejar");
  await page.locator("summary").filter({ hasText: "Destinos e atalhos" }).click();
  await page.getByText(/trajetos prontos pela cidade/).click();
  await page.getByRole("button", { name: "Abastecer", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(6);
  await page.getByRole("button", { name: "Calcular offline", exact: true }).click();
  await context.setOffline(true);
  await page.getByRole("button", { name: /^Calcular Centro/ }).first().click();
  await expect(page.getByRole("button", { name: "Ocultar mapa", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Abrir mapa em tela cheia", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Estimativa em linha reta · sem curvas confirmadas")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
