import { expect, test } from "@playwright/test";

// These tests control the tile provider. A service worker can bypass Playwright
// request interception; offline package behavior is covered in the other specs.
test.use({ serviceWorkers: "block" });

test("Pages: station map and directory are usable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  // Keep this layout test independent of the tile provider's availability.
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  }));
  await page.goto("mapa/postos", { waitUntil: "domcontentloaded" });
  const map = page.locator("#aguas-lindas-map");
  const picker = map.getByRole("button", { name: "Escolher posto no mapa" });
  await expect(picker).toBeVisible();
  await expect(map.getByText(/\d+ posicionados · \d+ sem coordenada/)).toBeVisible();
  await picker.click();
  const search = page.getByRole("combobox", { name: "Pesquisar lugares no mapa" });
  await expect(search).toBeFocused();
  await expect.poll(() => page.getByRole("listbox", { name: "Resultados de lugares" }).getByRole("option").count()).toBeGreaterThan(1);
  const option = page.getByRole("listbox", { name: "Resultados de lugares" }).getByRole("option").last();
  const station = { name: (await option.locator(".font-bold").textContent())! };
  await search.fill("zzzz-inexistente");
  await expect(page.getByRole("listbox", { name: "Resultados de lugares" }).getByRole("option")).toHaveCount(0);
  await search.fill("");
  const panel = page.locator('[data-slot="popover-content"]');
  expect((await panel.boundingBox())!.height).toBeLessThan(400);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole("listbox", { name: "Resultados de lugares" }).getByRole("option").last().click();
  await expect(panel).toHaveCount(0);
  const marker = map.getByRole("button", { name: "Abrir " + station.name, exact: true });
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  const box = await marker.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await marker.click({ trial: true });
  await expect(map.locator("p").filter({ hasText: station.name })).toBeVisible();
  const directory = page.getByRole("textbox", { name: "Filtrar diretório de postos" });
  await directory.scrollIntoViewIfNeeded();
  expect(await directory.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await directory.fill("zzzz-inexistente");
  await expect(page.getByRole("button", { name: /Mostrar mais \d+ postos/ })).toHaveCount(0);
  await directory.fill("");
  const card = page.locator("article[id^='posto-']").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByRole("heading")).toBeVisible();
  expect(await card.evaluate(el => {
    const texts = [...el.querySelectorAll("p, span, button, a")].filter(item => item.textContent?.trim());
    return Math.min(...texts.map(item => parseFloat(getComputedStyle(item).fontSize)));
  })).toBeGreaterThanOrEqual(12);
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll("main input, main select, main section, main button")]
      .filter(el => el.getBoundingClientRect().right > innerWidth)
      .map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 80), right: el.getBoundingClientRect().right, classes: el.className })),
  }));
  expect(layout.width, JSON.stringify(layout.overflowing)).toBeLessThanOrEqual(320);
});

test("Pages: background failure keeps the offline picker and navigation touchable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  await page.goto("mapa/postos", { waitUntil: "domcontentloaded" });
  const map = page.locator("#aguas-lindas-map");
  await expect(map.getByRole("img", { name: /Mapa offline vetorial/ })).toBeVisible();
  const picker = map.getByRole("button", { name: "Escolher posto no mapa offline" });
  await picker.click();
  const option = page.getByRole("listbox", { name: "Resultados de lugares" }).getByRole("option").last();
  const name = (await option.locator(".font-bold").textContent())!;
  await option.click();
  await expect(map.locator("p").filter({ hasText: name })).toBeVisible();
  await map.getByRole("button", { name: "Navegar pelo Google Maps", exact: true }).click({ trial: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("Pages: saved station map does not clip its navigation card", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.setItem("trajeto-mobile-station-favorites", JSON.stringify([
    { placeId: "fixture-saved", name: "Posto salvo de teste", address: "Endereço de teste", lat: -15.7545, lng: -48.2816, openingHours: [] },
  ])));
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  }));
  await page.goto("postos?salvos=1", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Abrir mapa", exact: true }).click();
  const picker = page.getByRole("button", { name: "Escolher posto no mapa" });
  await expect(picker).toBeVisible();
  await page.getByRole("button", { name: "Google", exact: true }).click({ trial: true });
});

test("Pages: station search uses compact cards and resets an empty query", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("postos?q=ponteio", { waitUntil: "domcontentloaded" });
  const card = page.locator("article[id^='posto-']").first();
  await expect(card.getByRole("heading")).toContainText(/ponteio/i);
  await expect(card.getByRole("link", { name: "Traçar rota", exact: true })).toHaveAttribute("href", /planejar.*destino=/);
  await expect(card.getByRole("link", { name: "Navegar", exact: true })).toBeVisible();
  await card.getByText("Mais opções do posto").click();
  await expect(card.getByRole("link", { name: "Pesquisar este posto na web" })).toBeVisible();
  await expect(card.locator("details").filter({ hasText: "Todos os dados disponíveis" })).not.toHaveAttribute("open");
  await expect(page.locator("details").filter({ has: page.getByText("Fontes e referências adicionais", { exact: true }) })).not.toHaveAttribute("open");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Abrir mapa", exact: true }).click();
  await expect(page.locator("#aguas-lindas-map")).toBeVisible();
  await page.getByRole("button", { name: "Ocultar mapa", exact: true }).click();
  await expect(page.locator("#aguas-lindas-map")).toHaveCount(0);
  await page.goto("postos?q=zzzz-inexistente", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Nenhum posto encontrado com esses filtros.")).toBeVisible();
  await page.getByRole("button", { name: "Ver todos os postos", exact: true }).click();
  await expect(page.locator("article[id^='posto-']").first()).toBeVisible();
});
