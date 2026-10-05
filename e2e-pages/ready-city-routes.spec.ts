import { expect, test } from "@playwright/test";

// Service-worker requests can bypass page.route and defeat the simulated failures.
test.use({ serviceWorkers: "block" });

test("mobile home calculates directly and exposes ready trips without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.route("https://router.project-osrm.org/**", route => route.abort());
  await page.route("https://nominatim.openstreetmap.org/**", route => route.abort());
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  await page.goto("");
  const origin = page.getByPlaceholder("De onde você sai");
  const services = page.getByRole("button", { name: /Saúde e cidadania/ });
  expect((await origin.boundingBox())!.y).toBeLessThan((await services.boundingBox())!.y);
  const shortcuts = page.locator("details").filter({ has: page.locator("summary", { hasText: /trajetos prontos pela cidade/ }) });
  await shortcuts.locator("summary").first().click();
  await expect(shortcuts.locator("article")).toHaveCount(6);
  await shortcuts.getByRole("button", { name: /Ver mais/ }).click();
  await expect(shortcuts.locator("article")).toHaveCount(18);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await shortcuts.getByRole("searchbox", { name: "Buscar trajeto" }).fill("prefeitura upa");
  await expect(shortcuts.locator("article")).toHaveCount(1);
  await shortcuts.getByRole("combobox", { name: "Como você vai?" }).selectOption("walking");
  await shortcuts.getByRole("button", { name: "Calcular offline", exact: true }).click();
  await shortcuts.getByRole("button", { name: /Calcular Prefeitura → UPA/ }).click();
  await expect(page).toHaveURL(/experiencia=offline/);
  await expect(page).toHaveURL(/auto=1/);
  await expect(page).toHaveURL(/modo=walking/);
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

test("ready streets: selects a departure, calculates offline and keeps mobile cards within the screen", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("");
  // Prepare the planner module before disconnecting: this test blocks service workers.
  await page.getByRole("button", { name: "Rotas", exact: true }).click();
  await expect(page.getByPlaceholder("Para onde você vai")).toBeVisible();
  await page.getByRole("button", { name: "Início", exact: true }).click();
  const shortcuts = page.locator("details").filter({ has: page.locator("summary", { hasText: /trajetos prontos pela cidade/ }) });
  await shortcuts.locator("summary").first().click();
  await shortcuts.getByRole("combobox", { name: "Saindo de" }).selectOption("via-osm-0da29ee8ad6a");
  await shortcuts.getByRole("searchbox", { name: "Buscar trajeto" }).fill("UPA");
  await expect(shortcuts.locator("article")).toHaveCount(1);
  await expect(shortcuts.getByText(/Referência aproximada/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await context.setOffline(true);
  await expect(shortcuts.getByRole("button", { name: "Offline ativo", exact: true })).toBeDisabled();
  await shortcuts.getByRole("button", { name: "Calcular Avenida JK → UPA", exact: true }).click();
  await expect(page.getByPlaceholder("De onde você sai")).toHaveValue("Avenida JK · referência no mapa, Águas Lindas de Goiás - GO");
  await expect(page.getByRole("region", { name: "Explorar mapa offline" })).toBeVisible();
  await expect(page.getByText(/Estimativa local/).first()).toBeVisible();
});
