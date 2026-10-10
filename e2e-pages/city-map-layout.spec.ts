import { expect, test } from "@playwright/test";

test("map is reachable sooner, with one clear reset at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("mapa?camada=saude&q=UPA", { waitUntil: "domcontentloaded" });
  const search = page.getByRole("textbox", { name: "Buscar destino no mapa" });
  await expect(search).toHaveValue("UPA");

  const categories = page.getByRole("group", { name: "Categorias do mapa" });
  const choices = categories.getByRole("button");
  await expect(choices.nth(0)).toHaveText("Tudo");
  await expect(choices.nth(1)).toHaveText("Ruas e avenidas");
  await expect(categories.getByRole("button", { name: "Saúde" })).toHaveAttribute("aria-pressed", "true");

  const map = page.locator("section[aria-label='Mapa da cidade']");
  const provider = page.getByRole("combobox", { name: "Aplicativo de mapa preferido" });
  await expect(map).toBeVisible();
  await expect(provider).toBeVisible();
  expect((await map.boundingBox())!.y).toBeLessThan((await provider.boundingBox())!.y);

  await page.getByRole("button", { name: "Limpar todos os filtros do mapa" }).click();
  await expect(search).toHaveValue("");
  await expect(categories.getByRole("button", { name: "Tudo" })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\/mapa\/?$/);
  await expect(page.getByRole("button", { name: "Limpar todos os filtros do mapa" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver resultados", exact: true }).click();
  await expect(page.locator("#city-destinations")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});


test("deep-linked layers stay visible in the horizontal rail at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("mapa?camada=meio-ambiente", { waitUntil: "domcontentloaded" });
  const rail = page.getByRole("group", { name: "Categorias do mapa" });
  const active = rail.getByRole("button", { name: "Meio ambiente" });
  await expect(active).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => {
    const bar = await rail.boundingBox();
    const chip = await active.boundingBox();
    if (!bar || !chip) return false;
    return chip.x >= bar.x - 2 && chip.x + chip.width <= bar.x + bar.width + 2;
  }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("empty search offers a one-tap way to reset or edit, without leaking position", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("mapa?camada=seguranca&q=zzz-destino-inexistente-123", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Nenhum destino encontrado. Tente outro nome ou categoria.")).toBeVisible();
  await page.getByRole("button", { name: "Corrigir busca" }).click();
  await expect(page.getByRole("textbox", { name: "Buscar destino no mapa" })).toBeFocused();
  await page.getByRole("button", { name: "Ver todos os destinos" }).click();
  await expect(page.getByRole("textbox", { name: "Buscar destino no mapa" })).toHaveValue("");
  await expect(page.getByRole("group", { name: "Categorias do mapa" }).getByRole("button", { name: "Tudo" })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\/mapa\/?$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
