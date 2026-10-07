import { expect, test } from "@playwright/test";

test("resumo de filtros mostra estado ativo no mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos?categoria=saude&recurso=rota", { waitUntil: "domcontentloaded" });
  const summary = page.locator("#service-filters summary");
  await expect(summary).toContainText("Saúde · Rota");
});

test("central de serviços abre offline e filtra saúde", async ({ page }) => {
  await page.goto("/servicos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Como podemos ajudar/i })).toBeVisible();
  await page.locator("#service-filters summary").click();
  await expect(page.getByRole("button", { name: "Saúde", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Saúde", exact: true }).click();
  await expect(page.getByRole("heading", { name: /UPA Mansões Odisseia/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Hospital Municipal Bom Jesus/i })).toBeVisible();
});

test("busca local oferece categorias prontas", async ({ page }) => {
  await page.goto("/buscar", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre e vá\./i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saúde", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Segurança", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Mais opções: postos, comércio e outras categorias" }).click();
  await expect(page.getByRole("button", { name: "Postos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Segurança", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Educação", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Saúde", exact: true }).click();
  await expect(page).toHaveURL(/\/servicos\?categoria=saude/);
});

test("atalho público leva da home para serviços municipais", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("summary").filter({ hasText: "Explore a cidade" }).click();
  await page.getByRole("button", { name: "Saúde", exact: true }).click();
  await expect(page).toHaveURL(/\/servicos\?categoria=saude/);
  await expect(page.getByRole("heading", { name: /UPA Mansões Odisseia/i })).toBeVisible();
});
