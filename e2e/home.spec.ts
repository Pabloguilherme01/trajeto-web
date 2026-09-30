import { expect, test } from "@playwright/test";

test("home: prioriza busca, proximidade e rota", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Onde você quer abastecer/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /buscar posto/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Perto de mim/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /No caminho/i })).toBeVisible();
});
