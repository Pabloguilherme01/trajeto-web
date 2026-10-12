import { expect, test } from "@playwright/test";

// Both devices exercise the GitHub Pages base path without fetching map tiles
// or involving the PWA worker. Offline installation has separate coverage.
test.use({ serviceWorkers: "block" });

test("Android/iOS: service mode previews match results, preserve refinements and deep links at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("servicos?q=cras&categoria=assistencia", { waitUntil: "domcontentloaded" });
  const group = page.getByRole("group", { name: "Recursos disponíveis" });
  const search = page.getByRole("textbox", { name: "Buscar serviços públicos" });
  const all = group.getByRole("button", { name: "Ver tudo", exact: true });
  const expectPreview = async (label: string) => {
    const button = group.getByRole("button", { name: label, exact: true });
    await expect(button.getByText(/^\d+ serviços?$/)).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => {
      const count = (await button.getByText(/^\d+ serviços?$/).innerText()).split(" ")[0];
      return page.getByText(new RegExp(`^${count} serviços encontrados`)).count();
    }).toBe(1);
    await expect(search).toHaveValue("cras");
    expect(new URL(page.url()).searchParams.get("categoria")).toBe("assistencia");
  };
  for (const label of ["Ligar ou WhatsApp", "Ir até o local", "Resolver online", "Ver tudo"]) {
    await expectPreview(label);
  }
  // Saving changes preview membership only when the saved-only filter is active.
  await page.getByRole("button", { name: /^Salvar serviço:/ }).first().click();
  await page.locator("#service-filters summary").click();
  await page.getByRole("button", { name: /^Serviços salvos/ }).click();
  await expect(all.getByText("1 serviço", { exact: true })).toBeVisible();
  for (const label of ["Resolver online", "Ligar ou WhatsApp", "Ver tudo"]) {
    await expectPreview(label);
    expect(new URL(page.url()).searchParams.get("salvos")).toBe("1");
  }
  await search.fill("zzzx-servico-inexistente-2026");
  await expect(group.getByText("0 serviços", { exact: true })).toHaveCount(4);
  await group.getByRole("button", { name: "Ir até o local" }).click();
  await expect(search).toHaveValue("zzzx-servico-inexistente-2026");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  // The selected record remains visible even if unrelated filters exclude it.
  await page.goto("servicos?servico=ligue-180&q=zzzx&categoria=educacao&recurso=rota&salvos=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#service-ligue-180")).toBeVisible();
  await expect(group.getByText(/^\d+ serviços?$/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Android/iOS: mode previews match selection and keep search at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("postos?q=postos", { waitUntil: "domcontentloaded" });
  const rail = page.getByRole("group", { name: "Modos de filtro dos postos" });
  const anp = rail.getByRole("button", { name: /^Dados ANP\b/ });
  const all = rail.getByRole("button", { name: /^Todos\b/ });
  const anpCount = anp.getByText(/^\d+ postos?$/);
  await expect(anpCount).toBeVisible();
  await anp.click();
  await expect(anp).toHaveAttribute("aria-pressed", "true");
  const panel = rail.locator("..");
  // The ANP snapshot may arrive during the interaction. Compare current
  // badge and header values rather than freezing a pre-hydration count.
  const sameCount = async () =>
    await anpCount.innerText() === await panel.locator('[aria-live="off"]').innerText();
  await expect.poll(sameCount).toBe(true);
  const fuel = page.getByRole("combobox", { name: "Filtrar por combustível" });
  await fuel.selectOption("gasolina-comum");
  await expect.poll(sameCount).toBe(true);
  const search = page.getByRole("searchbox", { name: "Buscar no diretório de postos" });
  await search.fill("zzzx-sem-postos-2026");
  await expect(search).toHaveValue("zzzx-sem-postos-2026");
  await expect(all.getByText("0 postos", { exact: true })).toBeVisible();
  await expect(anp.getByText("0 postos", { exact: true })).toBeVisible();
  await all.click();
  await expect(all).toHaveAttribute("aria-pressed", "true");
  await expect(search).toHaveValue("zzzx-sem-postos-2026");
  await expect(fuel).toHaveValue("gasolina-comum");
  await search.fill("");
  await expect(all.getByText(/^[1-9][0-9]* postos?$/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});

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
  await expect(modesPanel.locator('[aria-live="off"]')).toHaveText("0 postos");
  await directorySearch.fill("");
  await expect(modesPanel.locator('[aria-live="off"]')).toHaveText(/^[1-9][0-9]* postos$/);

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

test("Android/iOS: ready-route categories follow focus and selection inside the mobile rail", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("servicos", { waitUntil: "domcontentloaded" });
  const rail = page.getByRole("group", { name: "Filtrar rotas prontas" });
  const all = rail.getByRole("button", { name: /^Todas as rotas prontas/ });
  await expect(all).toHaveAttribute("aria-pressed", "true");
  const search = page.getByRole("searchbox", { name: "Buscar rota pronta" });
  // iPhone Safari must not zoom the entire page when this field takes focus.
  expect(await search.evaluate(input => parseFloat(getComputedStyle(input).fontSize))).toBeGreaterThanOrEqual(16);
  const routeStatus = page.locator("#ready-routes").getByRole("status");
  await search.fill("zzzx-rotas-inexistentes-2026");
  await expect(search).toHaveValue("zzzx-rotas-inexistentes-2026");
  await expect(routeStatus).toContainText("0 destinos neste filtro · 0 exibidos");
  await search.fill("upa");
  await expect(routeStatus).toContainText(/^[1-9][0-9]* destinos neste filtro/);
  await search.fill("HEAL");
  const last = rail.getByRole("button", { name: /^Filtrar rotas:/ }).last();
  await rail.scrollIntoViewIfNeeded();
  const beforePageScroll = await page.evaluate(() => window.scrollY);
  await last.evaluate(element => (element as HTMLElement).focus({ preventScroll: true }));
  const withinRail = () => last.evaluate(element => {
    const parent = element.closest('[aria-label="Filtrar rotas prontas"]')!;
    const area = parent.getBoundingClientRect();
    const button = element.getBoundingClientRect();
    return button.left >= area.left - 2 && button.right <= area.right + 2;
  });
  await expect.poll(withinRail).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(beforePageScroll);
  await last.click();
  await expect(last).toHaveAttribute("aria-pressed", "true");
  await expect(all).toHaveAttribute("aria-pressed", "false");
  await expect(search).toHaveValue("HEAL");
  await expect.poll(withinRail).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});

test("Android/iOS: advanced station coordinate filter stays reachable in its own rail", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("postos?q=postos", { waitUntil: "domcontentloaded" });
  const rail = page.getByRole("group", { name: "Filtros adicionais dos postos" });
  const coordinateFilter = rail.getByRole("button", { name: "Com coordenadas" });
  await rail.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await coordinateFilter.evaluate(button => (button as HTMLElement).focus({ preventScroll: true }));
  const fullyVisible = () => coordinateFilter.evaluate(button => {
    const area = button.closest('[aria-label="Filtros adicionais dos postos"]')!.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    return rect.left >= area.left - 2 && rect.right <= area.right + 2;
  });
  await expect.poll(fullyVisible).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await coordinateFilter.click();
  await expect(coordinateFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Modos de filtro dos postos" })
    .getByRole("button", { name: /^Com rota/ })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(fullyVisible).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});

test("Android/iOS: planner destination catalog mounts limited cards and remains responsive at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("planejar?destinos=1", { waitUntil: "domcontentloaded" });
  const region = page.getByRole("region", { name: "Lista de destinos disponíveis" });
  await expect(region).toBeVisible();
  await expect(region.getByRole("button")).toHaveCount(24);
  const showMore = page.getByRole("button", { name: /Mostrar mais destinos/ });
  await showMore.click();
  await expect(region.getByRole("button")).toHaveCount(48);
  const search = page.getByRole("textbox", { name: "Filtrar todos os destinos disponíveis" });
  expect(await search.evaluate(input => parseFloat(getComputedStyle(input).fontSize))).toBeGreaterThanOrEqual(16);
  await search.fill("zzzx-destino-inexistente-2026");
  await expect(search).toHaveValue("zzzx-destino-inexistente-2026");
  await expect(region.getByText("Nenhum destino corresponde ao filtro.")).toBeVisible();
  await expect(region.getByRole("button")).toHaveCount(0);
  await search.fill("HEAL");
  await expect(region.getByRole("button").first()).toBeVisible();
  await expect.poll(() => region.getByRole("button").count()).toBeLessThanOrEqual(24);
  await expect(search).toHaveValue("HEAL");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});

test("Android/iOS: planner category filters reveal keyboard focus without moving the page at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("planejar?destinos=1", { waitUntil: "domcontentloaded" });
  const rail = page.getByRole("group", { name: "Categorias dos destinos" });
  const all = rail.getByRole("button", { name: "Todos" });
  const last = rail.getByRole("button", { name: "Centro" });
  await expect(all).toHaveAttribute("aria-pressed", "true");
  const search = page.getByRole("textbox", { name: "Filtrar todos os destinos disponíveis" });
  await search.fill("HEAL");
  await rail.scrollIntoViewIfNeeded();
  const beforeScroll = await page.evaluate(() => window.scrollY);
  await last.evaluate(element => (element as HTMLElement).focus({ preventScroll: true }));
  const inRail = () => last.evaluate(element => {
    const railBounds = element.closest('[aria-label="Categorias dos destinos"]')!.getBoundingClientRect();
    const button = element.getBoundingClientRect();
    return button.left >= railBounds.left - 2 && button.right <= railBounds.right + 2;
  });
  await expect.poll(inRail).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll);
  await last.click();
  await expect(last).toHaveAttribute("aria-pressed", "true");
  await expect(all).toHaveAttribute("aria-pressed", "false");
  await expect(search).toHaveValue("HEAL");
  await expect(page.locator("#all-destinations-panel").getByRole("status")).toContainText("0 destinos encontrados");
  await expect.poll(inRail).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});
