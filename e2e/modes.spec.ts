import { expect, test } from "@playwright/test";

test("modo economia abre a calculadora local", async ({ page }) => {
  await page.goto("/planejar?economia=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Calculadora pronta." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Calcule o custo da viagem." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Distância de ida/i })).toBeVisible();
});

test("modo condução prepara o planejador para navegação externa", async ({ page }) => {
  await page.goto("/planejar?conducao=1&destino=Águas%20Lindas%20de%20Goiás", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Modo condução ativo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Calcular rota" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir Google Maps agora" })).toBeVisible();
});

test("home mostra modos rápidos e ação automática", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Escolha como quer usar o Trajeto hoje/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Automático:/i })).toBeVisible();
  await page.getByRole("button", { name: "Trocar modo" }).click();
  await expect(page.getByRole("button", { name: "Economia", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Condução", exact: true })).toBeVisible();
});
