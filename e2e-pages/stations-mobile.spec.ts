import { expect, test } from "@playwright/test";

test("Pages: station map and directory are usable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  // Keep this layout test independent of the tile provider's availability.
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  }));
  await page.goto("mapa", { waitUntil: "domcontentloaded" });
  const map = page.locator("#aguas-lindas-map");
  const picker = map.getByRole("combobox", { name: "Escolher posto no mapa" });
  await expect(picker).toBeVisible();
  const options = await picker.locator("option").evaluateAll(items =>
    items.map(item => ({ value: (item as HTMLOptionElement).value, name: item.textContent! }))
  );
  expect(options.length).toBeGreaterThan(1);
  const station = options[options.length - 1];
  await picker.selectOption(station.value);
  const marker = map.getByRole("button", { name: "Abrir " + station.name, exact: true });
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  const box = await marker.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await expect(map.getByText(station.name, { exact: true }).filter({ visible: true })).toBeVisible();
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
