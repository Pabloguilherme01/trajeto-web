import { expect, test } from "@playwright/test";

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

test("Pages: help entry actions keep 44px targets on small phones", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("ajuda", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Use o Trajeto em poucos passos/i })).toBeVisible();

  for (const text of ["Abrir central", "Planejar uma rota", "Encontrar postos"]) {
    const link = page.getByRole("link", { name: new RegExp(text, "i") }).first();
    await link.scrollIntoViewIfNeeded();
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
