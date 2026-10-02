import { expect, test } from "@playwright/test";

// Service-worker requests can bypass page.route and defeat the simulated failures.
test.use({ serviceWorkers: "block" });

test("mobile home calculates directly and exposes 12 ready trips without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.route("https://router.project-osrm.org/**", route => route.abort());
  await page.route("https://nominatim.openstreetmap.org/**", route => route.abort());
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  await page.goto("");
  const origin = page.getByPlaceholder("De onde você sai");
  const services = page.getByRole("button", { name: /Saúde e cidadania/ });
  expect((await origin.boundingBox())!.y).toBeLessThan((await services.boundingBox())!.y);
  await page.getByText("12 trajetos prontos pela cidade", { exact: true }).click();
  const shortcuts = page.locator("details").filter({ has: page.locator("summary", { hasText: "12 trajetos prontos" }) });
  await expect(shortcuts.getByRole("button")).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await shortcuts.getByRole("button", { name: /Prefeitura → UPA/ }).click();
  await expect(page).toHaveURL(/auto=1/);
  await expect(page.getByPlaceholder("De onde você sai")).toHaveValue(/Prefeitura/);
  await expect(page.getByPlaceholder("Para onde você vai")).toHaveValue(/UPA/);
  await expect(page.getByRole("region", { name: "Explorar mapa offline" })).toBeVisible();
});

test("quick home form submits an automatic calculation", async ({ page }) => {
  await page.route("https://router.project-osrm.org/**", route => route.abort());
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  await page.goto("");
  await page.getByPlaceholder("De onde você sai").fill("Prefeitura de Águas Lindas de Goiás");
  await page.getByPlaceholder("Para onde você vai").fill("UPA Mansões Odisseia");
  await page.getByRole("button", { name: "Calcular rota", exact: true }).click();
  await expect(page).toHaveURL(/auto=1/);
  await expect(page.getByRole("region", { name: "Explorar mapa offline" })).toBeVisible();
});
