import { expect, test } from "@playwright/test";

test("home: prioriza busca, proximidade e rota", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /O que você quer encontrar/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /buscar na cidade/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Perto de mim/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /No caminho/i })).toBeVisible();
});


test("home: resolve destino institucional conhecido sem busca duplicada", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const search = page.getByRole("textbox", { name: /buscar na cidade/i });

  await search.fill("Vapt Vupt");
  await page.getByRole("button", { name: /Pesquisar na cidade/i }).click();

  await expect(page).toHaveURL(/\/local\/vapt-vupt/);
});
