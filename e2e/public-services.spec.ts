import { expect, test } from "@playwright/test";

test("central de serviços abre offline e filtra saúde", async ({ page }) => {
  await page.goto("/servicos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Águas Lindas em um só lugar/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saúde", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Saúde", exact: true }).click();
  await expect(page.getByRole("heading", { name: /UPA Mansões Odisseia/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Hospital Municipal Bom Jesus/i })).toBeVisible();
});

test("busca local oferece categorias prontas", async ({ page }) => {
  await page.goto("/buscar", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Encontre o que precisa\./i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saúde", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Segurança", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Mais opções: postos, comércio e outras categorias" }).click();
  await expect(page.getByRole("button", { name: "Postos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Segurança", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Educação", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Saúde", exact: true }).click();
  await expect(page).toHaveURL(/\/servicos\?categoria=saude/);
});

test("home encaminha problema urbano sem exigir nome da secretaria", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Escolha pelo que aconteceu." })).toBeVisible();
  await page.getByRole("button", { name: /Buraco \/ asfalto/i }).click();
  await expect(page).toHaveURL(/\/buscar\?q=buraco(?:%20|\+)rua/);
  await expect(page.getByText(/Encontramos isto para você/i)).toBeVisible();
  const autoAnswer = page.locator('section[aria-labelledby="search-auto-answer-title"]');
  await expect(autoAnswer.getByRole("heading", { name: "Secretaria Municipal de Infraestrutura e Obras", exact: true })).toBeVisible();
});

test("atalho público leva da home para serviços municipais", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("main").getByRole("button", { name: /Resolver um serviço/i }).click();
  await expect(page).toHaveURL(/\/servicos$/);
  await page.getByRole("button", { name: "Saúde", exact: true }).click();
  await expect(page).toHaveURL(/\/servicos\?categoria=saude/);
  await expect(page.getByRole("heading", { name: /UPA Mansões Odisseia/i })).toBeVisible();
});
