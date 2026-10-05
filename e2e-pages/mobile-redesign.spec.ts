import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("mobile: quick route stays above the dock and catalog remains available", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  const nav = page.getByRole("navigation", { name: "Navegação móvel" });
  await expect(nav.getByRole("button", { name: "Início", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("button", { name: "Rotas", exact: true })).toHaveAttribute("data-active", "false");
  const action = page.getByRole("button", { name: "Ir até aqui", exact: true });
  const actionBox = await action.boundingBox();
  const navBox = await nav.boundingBox();
  expect(actionBox!.y + actionBox!.height).toBeLessThan(navBox!.y);
  for (const name of ["Polícia 190", "SAMU 192", "Bombeiros 193"]) {
    const link = page.getByRole("link", { name });
    await expect(link).toBeVisible();
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("home-mobile.png") });
  await page.locator("summary").filter({ hasText: /^Rotas prontas$/ }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar trajeto" })).toBeVisible();
  await page.locator("summary").filter({ hasText: /^Rotas prontas$/ }).click();
  await page.getByPlaceholder("De onde você sai").fill("Prefeitura");
  await page.getByPlaceholder("Para onde você vai").fill("HEAL");
  await page.route("https://**/*", route => route.abort());
  await action.click();
  await expect(page).toHaveURL(/planejar.*auto=1/);
  await expect(page.getByRole("region", { name: "Explorar mapa offline" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("planner-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
