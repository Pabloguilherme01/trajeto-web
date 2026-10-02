import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Pages: home remains readable and touch-friendly at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() =>
    localStorage.setItem(
      "trajeto-install-dismissed-until",
      String(Date.now() + 86400000),
    ),
  );
  await page.goto("", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Resolva na cidade/i })).toBeVisible();

  await page.getByRole("button", { name: "Trocar modo", exact: true }).click();
  await expect(page.locator("#daily-modes-options")).toBeVisible();
  await page.locator("summary").filter({ hasText: "Recursos do aparelho" }).click();
  await expect(page.getByRole("heading", { name: /Preparação incompleta/i })).toBeVisible();

  const tinyText = await page.locator("main").evaluate(main =>
    [...main.querySelectorAll("p, span, button, a, label, summary")]
      .filter(element => {
        const text = element.textContent?.trim();
        const rect = element.getBoundingClientRect();
        if (!text || rect.width === 0 || rect.height === 0) return false;
        return parseFloat(getComputedStyle(element).fontSize) < 12;
      })
      .map(element => ({
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 80),
        size: getComputedStyle(element).fontSize,
        className: element.className,
      })),
  );
  expect(tinyText).toEqual([]);

  for (const control of [
    page.getByRole("button", { name: "Compartilhar Trajeto" }),
    page.getByRole("button", { name: "Central completa" }),
    page.getByRole("button", { name: "Ver catálogo" }),
    page.getByRole("button", { name: "Abrir guia" }),
    page.getByRole("button", { name: "Ver tudo" }),
    page.getByRole("button", { name: "Usar minha localização como origem" }),
    page.getByRole("button", { name: /^Automático:/ }),
    page.getByRole("button", { name: "Fechar", exact: true }),
    ...await page.locator("#daily-modes-options button").all(),
  ]) {
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  const inputs = await page.locator("main input").all();
  for (const input of inputs) {
    expect(parseFloat(await input.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

for (const savedTrip of [false, true]) {
  test(`Pages: expanded trip readiness has readable contrast at 320px (${savedTrip ? "saved trip" : "empty device"})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript(saved => {
      localStorage.setItem("trajeto-install-dismissed-until", String(Date.now() + 86400000));
      if (saved) localStorage.setItem("trajeto-last-trip", JSON.stringify({ origin: "Centro", destination: "UPA" }));
    }, savedTrip);
    await page.goto("", { waitUntil: "domcontentloaded" });
    await page.locator("summary").filter({ hasText: "Recursos do aparelho" }).click();
    const readiness = page.locator('[aria-labelledby="trip-readiness-title"]');
    await expect(readiness).toBeVisible();
    if (savedTrip) await expect(readiness.getByText("Última rota registrada neste aparelho.")).toBeVisible();
    const explanatoryText = readiness.getByText(/pontos verificados localmente/);
    const contrast = await explanatoryText.evaluate(element => {
      const foreground = getComputedStyle(element).color;
      const background = getComputedStyle(element.closest("section")!).backgroundColor;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      const rgb = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      // Keep CSS alpha precision: canvas pixels round alpha to 8 bits.
      const alpha = Number(foreground.match(/\/\s*([\d.]+)\s*\)/)?.[1]
        ?? foreground.match(/^rgba\(.*,[\s]*([\d.]+)\)$/)?.[1] ?? 1);
      const bg = rgb(background);
      const fg = rgb(foreground).map((channel, i) => channel * alpha + bg[i] * (1 - alpha));
      const luminance = (channels: number[]) => channels
        .map(channel => channel / 255)
        .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
        .reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
      const light = luminance(fg);
      const dark = luminance(bg);
      return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    const audit = await new AxeBuilder({ page })
      .include('[aria-labelledby="trip-readiness-title"]')
      .withRules(["color-contrast"])
      .analyze();
    expect(audit.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}

test("Pages: help entry actions keep 44px targets on small phones", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("ajuda", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Use o Trajeto em poucos passos/i })).toBeVisible();

  for (const text of ["Abrir central", "Planejar uma rota", "Explorar a cidade"]) {
    const link = page.getByRole("link", { name: new RegExp(text, "i") }).first();
    await link.scrollIntoViewIfNeeded();
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
