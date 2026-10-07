import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390]) {
  test(`service search and saved cards remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("servicos", { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByRole("button", { name: /Abrir .* no Organic Maps/ }).first()).toBeVisible();
    const mode = page.getByRole("combobox", { name: "Modo de navegação no Organic Maps" });
    await mode.selectOption("bike");
    await expect(mode).toHaveValue("bike");
    const filters = page.locator("#service-filters summary");
    await filters.click();
    await expect(page.getByRole("button", { name: "Tributos e notas", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Inclusão e igualdade", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Internet e telefonia", exact: true }).click();
    await expect(page.locator("#service-anatel-consumidor")).toBeVisible();
    await expect(page.locator("#service-filters details")).toHaveJSProperty("open", false);
    await expect(mode).toBeHidden();
    await page.getByRole("textbox", { name: "Buscar serviços públicos" }).fill("anatel");
    await page.getByRole("button", { name: "Pesquisar serviços", exact: true }).click();

    await page.getByRole("button", { name: "Salvar serviço: Anatel Consumidor · telefonia e internet", exact: true }).click();
    await page.getByRole("button", { name: "Serviços salvos (1)", exact: true }).click();
    await expect(page.locator("#service-anatel-consumidor")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Modo de navegação no Organic Maps" })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
    expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  });
}

test("Central shortcuts restore ready routes after a search at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("servicos?q=anatel&categoria=telecom&recurso=online", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#ready-routes")).toHaveCount(0);
  await page.getByRole("button", { name: "Usar offline", exact: true }).click();
  await expect(page).toHaveURL(/\/servicos$/);
  await expect(page.locator("#ready-routes")).toBeFocused();
  await expect(page.getByRole("button", { name: /Mostrar somente destinos offline/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("searchbox", { name: "Buscar rota pronta" }).fill("xxxxxxxx");
  await page.getByRole("button", { name: "Rotas prontas", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar rota pronta" })).toHaveValue("");
  await expect(page.getByRole("button", { name: /Mostrar somente destinos offline/ })).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
