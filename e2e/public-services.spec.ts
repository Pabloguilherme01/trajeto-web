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

test("busca de rotas prontas filtra destinos sem overflow em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos", { waitUntil: "domcontentloaded" });
  const routes = page.locator('section[aria-labelledby="ready-routes-title"]');
  const search = routes.getByRole("searchbox", { name: "Buscar rota pronta" });
  await search.fill("biblioteca");
  const libraryCard = routes.locator("article").filter({ hasText: "Biblioteca Municipal · Jardim Barragem II" });
  await expect(libraryCard).toBeVisible();
  await expect(libraryCard.getByRole("button", { name: /Planejar rota para Biblioteca Municipal/ })).toBeVisible();
  await expect(libraryCard.getByRole("button", { name: /no Organic Maps/ })).toBeVisible();
  await expect(libraryCard.getByText("Organic Maps", { exact: true })).toBeVisible();
  await expect(routes.getByText("1 destinos neste filtro", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await routes.getByRole("button", { name: "Limpar busca de rotas" }).click();
  await expect(search).toHaveValue("");

  await search.fill("UPA");
  const upaCard = routes.locator("article").filter({ hasText: "UPA" }).first();
  await expect(upaCard.locator('[data-route-readiness="offline"]')).toHaveText(/Destino offline/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("filtro Offline mostra apenas rotas resolvidas localmente em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos", { waitUntil: "domcontentloaded" });
  const routes = page.locator('section[aria-labelledby="ready-routes-title"]');
  const offline = routes.getByRole("button", { name: /Mostrar somente destinos offline/ });
  await offline.click();
  await expect(offline).toHaveAttribute("aria-pressed", "true");
  await expect(routes.locator('[data-route-readiness="online"]')).toHaveCount(0);
  await routes.getByRole("searchbox", { name: "Buscar rota pronta" }).fill("UPA");
  await expect(routes.locator('[data-route-readiness="offline"]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("ações principais ficam acessíveis e sem overflow em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos", { waitUntil: "domcontentloaded" });

  const actions = page.getByRole("navigation", { name: "Ações principais da Central" });
  await expect(actions.getByRole("button", { name: "Buscar serviço" })).toBeVisible();
  await expect(actions.getByRole("button", { name: "Mapa da cidade" })).toBeVisible();
  await expect(actions.getByRole("button", { name: "Rotas prontas" })).toBeVisible();
  await expect(actions.getByRole("button", { name: "Usar offline" })).toBeVisible();

  await actions.getByRole("button", { name: "Buscar serviço" }).click();
  await expect(page.getByRole("textbox", { name: "Buscar serviços públicos" })).toBeFocused();

  await actions.getByRole("button", { name: "Usar offline" }).click();
  await expect(page.getByRole("button", { name: /Mostrar somente destinos offline/ })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("resumo da Central abre filtros e rotas offline em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos", { waitUntil: "domcontentloaded" });

  const summary = page.getByRole("group", { name: "Resumo da Central" });
  await summary.getByRole("button", { name: /Abrir \d+ categorias de serviços/ }).click();
  await expect(page.locator("#service-filters details")).toHaveJSProperty("open", true);

  await summary.getByRole("button", { name: /Mostrar \d+ destinos offline/ }).click();
  const offline = page.getByRole("button", { name: /Mostrar somente destinos offline/ });
  await expect(offline).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#ready-routes")).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("resumo da Central fica visível e sem overflow em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos", { waitUntil: "domcontentloaded" });

  const summary = page.getByRole("group", { name: "Resumo da Central" });
  await expect(summary).toBeVisible();
  await expect(summary.getByText("serviços oficiais", { exact: true })).toBeVisible();
  await expect(summary.getByText("categorias", { exact: true })).toBeVisible();
  await expect(summary.getByText("rotas prontas", { exact: true })).toBeVisible();
  await expect(summary.getByText("destinos offline", { exact: true })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("descoberta inicial fica compacta sem esconder assuntos em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos", { waitUntil: "domcontentloaded" });

  const topicsDisclosure = page.locator("details").filter({
    has: page.getByText(/Ver todos os assuntos/),
  });
  const allTopics = topicsDisclosure.getByText(/Ver todos os assuntos/);
  const transparencyCategory = topicsDisclosure.getByRole("button", {
    name: /Transparência e participação/,
  });
  await expect(allTopics).toBeVisible();
  await expect(transparencyCategory).not.toBeVisible();
  await allTopics.click();
  await expect(transparencyCategory).toBeVisible();

  const needsDisclosure = page.locator("details").filter({
    has: page.getByText(/Ver todas as situações/),
  });
  await needsDisclosure.getByText(/Ver todas as situações/).click();
  await expect(
    needsDisclosure.getByRole("button", { name: /Juventude e primeiro emprego/ })
  ).toBeVisible();

  const moreShortcuts = page.getByText(/Mais atalhos úteis/);
  await expect(moreShortcuts).toBeVisible();
  await moreShortcuts.click();
  await expect(page.getByRole("button", { name: /Transparência e SIC/ })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
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

test("categoria de óbitos fica utilizável e sem overflow em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/servicos?categoria=obitos", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Auxílio funeral · assistência social" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Controle de óbitos e sepultamentos" })
  ).toBeVisible();
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
