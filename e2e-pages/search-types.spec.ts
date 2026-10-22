import { expect, test } from "@playwright/test";

test("result types survive reload and back navigation at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./buscar?q=cras");
  const types = page.getByRole("group", { name: "Tipos de resultado" });
  await types.getByRole("button", { name: /^Serviços/ }).click();
  await expect(page).toHaveURL(/tipo=services/);
  await types.getByRole("button", { name: /^Postos/ }).click();
  await expect(page.getByRole("heading", { name: /^Serviços públicos/ })).toHaveCount(0);
  await page.reload();
  await expect(types.getByRole("button", { name: /^Postos/ })).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(types.getByRole("button", { name: /^Serviços/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: /^Serviços públicos/ })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("home optional panels mount on demand and preserve their contents", async ({ page }) => {
  await page.goto("./");
  const summary = page.getByText("Explore a cidade", { exact: true });
  const panel = summary.locator("..");
  await expect(panel.locator("button")).toHaveCount(0);
  await summary.click();
  await expect(panel.getByRole("heading", { name: "Comer, comprar, resolver." })).toBeVisible();
  const count = await panel.locator("button").count();
  expect(count).toBeGreaterThan(0);
  await summary.click();
  await summary.click();
  await expect(panel.locator("button")).toHaveCount(count);
});


test("loaded business counts remain stable when selecting a noncommercial type", async ({ page }) => {
  await page.goto("./buscar?q=farmácia");
  const types = page.getByRole("group", { name: "Tipos de resultado" });
  const businesses = types.getByRole("button", { name: /^Empresas/ });
  await expect(businesses).toHaveText(/Empresas \(\d+\)/, { timeout: 30000 });
  const businessCount = await businesses.innerText();
  const totalCount = await types.getByRole("button", { name: /^Tudo/ }).innerText();
  await types.getByRole("button", { name: /^Serviços/ }).click();
  await expect(businesses).toHaveText(businessCount);
  await expect(types.getByRole("button", { name: /^Tudo/ })).toHaveText(totalCount);
  await expect(page.getByRole("heading", { name: /Empresas do catálogo/ })).toHaveCount(0);
  await types.getByRole("button", { name: /^Empresas/ }).click();
  await expect(page.getByRole("heading", { name: /Empresas do catálogo/ })).toBeVisible();
});

test("a service-only deep link leaves company counts unknown without downloading companies", async ({ page }) => {
  const commercialRequests: string[] = [];
  page.on("request", request => {
    if (/\/(?:part-|businessCatalog-)/.test(request.url())) commercialRequests.push(request.url());
  });
  await page.goto("./buscar?q=cras&tipo=services");
  await expect(page.getByRole("button", { name: "Empresas (…)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tudo (3+)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Serviços públicos/ })).toBeVisible();
  expect(commercialRequests).toEqual([]);
});
