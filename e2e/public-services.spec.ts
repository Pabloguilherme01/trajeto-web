import { expect, test } from "@playwright/test";

test("filtro de contato prioriza telefone no card mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos?q=detran&recurso=contato", { waitUntil: "domcontentloaded" });
  const card = page.locator("article").filter({ hasText: "Detran-GO · CNH, veículo e licenciamento" });
  const actions = card.locator("a, button");
  await expect(actions.filter({ hasText: /Ligar/i }).first()).toBeVisible();
});

test("filtro online expõe a ação digital principal no card", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos?q=detran&recurso=online", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Detran-GO · CNH, veículo e licenciamento/i })).toBeVisible();
  const card = page.locator("article").filter({ hasText: "Detran-GO · CNH, veículo e licenciamento" });
  const primaryActions = card.getByRole("group", { name: "Ações principais do serviço" });
  await expect(primaryActions.getByRole("link", { name: /Abrir serviços digitais do Detran · online/i })).toBeVisible();
});

test("serviço apenas digital mostra ação online no topo sem filtro", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos?q=editais%20cultura", { waitUntil: "domcontentloaded" });
  const card = page.locator("#service-editais-cultura");
  await expect(card.getByRole("heading", { name: "Editais e seleções públicas de cultura" })).toBeVisible();
  const primaryActions = card.getByRole("group", { name: "Ações principais do serviço" });
  await expect(primaryActions.getByRole("link", { name: /Consultar editais culturais · online/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("resumo de filtros mostra estado ativo no mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos?categoria=saude&recurso=rota", { waitUntil: "domcontentloaded" });
  const summary = page.locator("#service-filters summary");
  await expect(summary).toContainText("Saúde · Rota");
});

test("categorias usam faixa horizontal sem causar overflow em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos", { waitUntil: "domcontentloaded" });
  await page.locator("#service-filters summary").click();
  const categories = page.getByRole("group", { name: "Categorias de serviços" });
  await expect(categories).toBeVisible();
  expect(await categories.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  const sportCategory = categories.getByRole("button", { name: "Esporte e lazer", exact: true });
  await sportCategory.scrollIntoViewIfNeeded();
  await expect(sportCategory).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
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
