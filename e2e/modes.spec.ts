import { expect, test } from "@playwright/test";

test("modo economia abre a calculadora local", async ({ page }) => {
  await page.goto("/planejar?economia=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Calculadora pronta." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quanto custa ir?" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Distância de ida/i })).toBeVisible();
});

test("calculadora distingue viagem pontual de rotina e oferece atalhos do tanque", async ({ page }) => {
  await page.goto("/planejar?economia=1", { waitUntil: "domcontentloaded" });

  await page.getByRole("textbox", { name: /Distância de ida/i }).fill("30");
  await page.getByPlaceholder("5,89").fill("6");
  await page.getByPlaceholder("10,5").fill("10");

  await expect(page.getByText("sem projeção semanal")).toBeVisible();

  await page.getByRole("button", { name: /Trabalho \/ estudo/i }).click();
  await expect(page.getByText("5 viagem(ns)/semana")).toBeVisible();

  await page.getByText("Ajustes avançados", { exact: true }).click();
  await page.getByPlaceholder("Ex.: 45").fill("40");
  await page.getByRole("button", { name: "½", exact: true }).click();
  await expect(page.getByPlaceholder("Ex.: 18 ou 0")).toHaveValue("20");
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
  await page.getByRole("button", { name: "Economia", exact: true }).click();
  await expect(page).toHaveURL(/\/planejar\?economia=1/);
  await expect(page.getByRole("heading", { name: "Calculadora pronta." })).toBeVisible();
});
