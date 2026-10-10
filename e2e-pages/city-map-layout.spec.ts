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
