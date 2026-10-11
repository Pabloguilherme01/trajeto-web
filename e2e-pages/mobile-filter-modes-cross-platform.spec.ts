import { expect, test } from "@playwright/test";

// Both devices exercise the GitHub Pages base path without fetching map tiles
// or involving the PWA worker. Offline installation has separate coverage.
test.use({ serviceWorkers: "block" });

test("Android/iOS: station Premium modes remain touchable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("postos?q=postos", { waitUntil: "domcontentloaded" });
  const rail = page.getByRole("group", { name: "Modos de filtro dos postos" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("button")).toHaveCount(4);

  const all = rail.getByRole("button", { name: /^Todos\b/ });
  const route = rail.getByRole("button", { name: /^Com rota\b/ });
  const anp = rail.getByRole("button", { name: /^Dados ANP\b/ });
  await expect(all).toHaveAttribute("aria-pressed", "true");
  await route.click();
  await expect(route).toHaveAttribute("aria-pressed", "true");
  await expect(all).toHaveAttribute("aria-pressed", "false");
  await anp.click();
  await expect(anp).toHaveAttribute("aria-pressed", "true");
  await expect(route).toHaveAttribute("aria-pressed", "false");

  // The result count follows the actual deferred directory search on
  // Chromium Android and WebKit iOS; typing must never freeze the field.
  const directorySearch = page.getByRole("searchbox", { name: "Buscar no diretório de postos" });
  await directorySearch.fill("zzzx-nenhum-posto-2026");
  await expect(directorySearch).toHaveValue("zzzx-nenhum-posto-2026");
  const modesPanel = rail.locator("..");
  await expect(modesPanel.getByText("0 postos", { exact: true })).toBeVisible();
  await directorySearch.fill("");
  await expect(modesPanel.getByText(/^[1-9][0-9]* postos$/)).toBeVisible();

  // Native cards stay immediately readable after fast filter transitions,
  // without JS-controlled entrance animations on low-end mobile devices.
  const firstCard = page.locator('article[id^="posto-"]').first();
  await expect(firstCard).toBeVisible();
  await firstCard.scrollIntoViewIfNeeded();
  expect(await firstCard.evaluate(card =>
    getComputedStyle(card).opacity
  )).toBe("1");
  await expect(firstCard.getByRole("link", { name: "Ir até aqui" })).toBeVisible();
  await expect(firstCard.getByText("Mais opções do posto")).toBeVisible();

  const heights = await rail.getByRole("button").evaluateAll(
    buttons => buttons.map(button => button.getBoundingClientRect().height),
  );
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

  // A 16px input avoids unintentional zoom when iOS Safari focuses it.
  const search = page.getByRole("textbox", { name: "Buscar postos" });
  await search.scrollIntoViewIfNeeded();
  expect(await search.evaluate(input => parseFloat(getComputedStyle(input).fontSize)))
    .toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});

test("Android/iOS: service modes preserve URL, semantics and mobile grid", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("servicos", { waitUntil: "domcontentloaded" });
  const group = page.getByRole("group", { name: "Recursos disponíveis" });
  await expect(group).toBeVisible();
  await expect(group.getByRole("button")).toHaveCount(4);

  const all = group.getByRole("button", { name: "Ver tudo" });
  const online = group.getByRole("button", { name: "Resolver online" });
  const contact = group.getByRole("button", { name: "Ligar ou WhatsApp" });
  await expect(all).toHaveAttribute("aria-pressed", "true");

  await online.click();
  await expect(page).toHaveURL(/recurso=online/);
  await expect(online).toHaveAttribute("aria-pressed", "true");
  await contact.click();
  await expect(page).toHaveURL(/recurso=contato/);
  await expect(contact).toHaveAttribute("aria-pressed", "true");
  await all.click();
  await expect(all).toHaveAttribute("aria-pressed", "true");
  expect(new URL(page.url()).searchParams.has("recurso")).toBe(false);

  const heights = await group.getByRole("button").evaluateAll(
    buttons => buttons.map(button => button.getBoundingClientRect().height),
  );
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

  const search = page.getByRole("textbox", { name: "Buscar serviços públicos" });
  expect(await search.evaluate(input => parseFloat(getComputedStyle(input).fontSize)))
    .toBeGreaterThanOrEqual(16);
  // Search input paints immediately; counts must eventually match the
  // deferred query, not announce stale results during rapid typing.
  await search.fill("zzzx-servico-inexistente-2026");
  await expect(search).toHaveValue("zzzx-servico-inexistente-2026");
  await expect(page.getByText("0 serviços encontrados", { exact: true })).toBeVisible();
  await search.fill("anatel");
  await expect(page.getByText(/^[1-9][0-9]* serviços encontrados/)).toBeVisible();
  await online.click();
  await expect(online).toHaveAttribute("aria-pressed", "true");
  await expect(search).toHaveValue("anatel");
  await expect(page).toHaveURL(/recurso=online/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});

test("Android/iOS: advanced category stays visible and clears without resetting other filters", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("servicos?q=anatel&categoria=telecom&recurso=online", {
    waitUntil: "domcontentloaded",
  });
  const shortcuts = page.getByRole("group", { name: "Categorias mais usadas" });
  await expect(shortcuts).toBeVisible();
  await expect(shortcuts.getByRole("button")).toHaveCount(6);
  await expect(page.getByText("Categoria ativa: Internet e telefone")).toBeVisible();

  await page.getByRole("button", {
    name: "Remover filtro da categoria Internet e telefone",
  }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("categoria")).toBeNull();
  expect(new URL(page.url()).searchParams.get("q")).toBe("anatel");
  expect(new URL(page.url()).searchParams.get("recurso")).toBe("online");

  const health = shortcuts.getByRole("button", { name: "Filtrar por Saúde" });
  await health.click();
  await expect(health).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => new URL(page.url()).searchParams.get("categoria")).toBe("saude");
  await expect(shortcuts.getByRole("button", { name: "Filtrar por Tudo" }))
    .toHaveAttribute("aria-pressed", "false");

  const heights = await shortcuts.getByRole("button").evaluateAll(
    buttons => buttons.map(button => button.getBoundingClientRect().height),
  );
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});

test("Android/iOS: map reuses overlapping street tiles and preserves offline controls at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // Public tile network conditions must not affect map interaction testing.
  await page.route("https://tile.openstreetmap.org/**", route =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto("mapa", { waitUntil: "domcontentloaded" });
  const map = page.getByRole("region", { name: "Mapa de destinos", exact: true });
  await expect(map).toBeVisible();
  const tiles = map.locator('[data-map-tile-layer] img');
  await expect.poll(() => tiles.count()).toBeGreaterThan(0);
  const initial = await tiles.evaluateAll(images => images.map(image => image.getAttribute("src")));
  await map.focus();
  await map.press("ArrowRight");
  const next = await tiles.evaluateAll(images => images.map(image => image.getAttribute("src")));
  expect(next.some(src => initial.includes(src))).toBe(true);
  expect(next.length).toBeLessThanOrEqual(30);
  await page.getByRole("button", { name: "Abrir mapa local offline" }).click();
  await expect(page.getByRole("button", { name: "Voltar ao mapa de ruas" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar ao mapa de ruas" }).click();
  await expect(map).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});

test("Android/iOS: map category deep links and keyboard focus stay inside the filter rail", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("mapa?camada=meio-ambiente", { waitUntil: "domcontentloaded" });
  const rail = page.getByRole("group", { name: "Categorias do mapa" });
  const active = rail.getByRole("button", { name: "Meio ambiente" });
  await expect(active).toHaveAttribute("aria-pressed", "true");
  const inside = async (button: typeof active) => {
    return button.evaluate(element => {
      const parent = element.closest('[aria-label="Categorias do mapa"]')!;
      const p = parent.getBoundingClientRect();
      const c = element.getBoundingClientRect();
      return c.left >= p.left - 2 && c.right <= p.right + 2;
    });
  };
  await expect.poll(() => inside(active)).toBe(true);
  const beforeScroll = await page.evaluate(() => window.scrollY);
  const education = rail.getByRole("button", { name: "Educação" });
  await education.evaluate(element => (element as HTMLElement).focus({ preventScroll: true }));
  await expect.poll(() => inside(education)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll);
  await education.click();
  await expect(education).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/camada=educacao/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});
