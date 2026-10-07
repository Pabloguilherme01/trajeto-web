import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("banking services stay searchable offline and categories fit 320px", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("servicos?categoria=financas", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#service-results article")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Planejar rota", exact: true })).toHaveCount(0);
  await page.locator("#service-filters summary").click();
  const categories = page.getByRole("group", { name: "Categorias de serviços", exact: true });
  await expect(categories.getByRole("button", { name: /Finanças e bancos/ })).toBeVisible();
  expect(await categories.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await context.setOffline(true);
  await page.getByRole("textbox", { name: "Buscar serviços públicos" }).fill("dinheiro esquecido");
  await page.getByRole("button", { name: "Pesquisar serviços", exact: true }).click();
  await expect(page.locator("#service-results article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Valores a Receber · dinheiro esquecido" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Consultar Valores a Receber/ })).toHaveAttribute("href", "https://valoresareceber.bcb.gov.br/");
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
});

for (const width of [320, 390]) {
  test(`service search and saved cards remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("servicos", { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll("main [id]")).map(element => element.id);
      return ids.length === new Set(ids).size;
    })).toBe(true);
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

test("service needs and Organic Maps modes remain usable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("servicos", { waitUntil: "domcontentloaded" });
  await page.getByRole("searchbox", { name: "Buscar rota pronta" }).fill("baixar empresa");
  await expect(page.getByRole("button", { name: /Planejar rota para Sala do Empreendedor/ })).toBeVisible();
  await page.goto("servicos?servico=upa-mansoes-odisseia", { waitUntil: "domcontentloaded" });
  const mode = page.getByRole("combobox", { name: "Modo de navegação no Organic Maps" });
  await mode.selectOption("walk");
  await expect(page.getByRole("button", { name: /Abrir .* no Organic Maps/ })).toContainText("a pé");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.goto("servicos?categoria=capacitacao", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#service-results article")).toHaveCount(2);
  await expect(page.getByText("ficha disponível offline")).toHaveCount(2);
  await expect(page.getByRole("combobox", { name: "Modo de navegação no Organic Maps" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
});
