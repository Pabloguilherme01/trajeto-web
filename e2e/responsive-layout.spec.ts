import { expect, test } from "@playwright/test";

test("public screens stay inside the viewport before and after scrolling and focusing inputs", async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [320, 360, 390, 768]) {
    await page.setViewportSize({ width, height: 740 });
    for (const path of ["/", "/planejar", "/servicos", "/mapa", "/ajuda"]) {
      await page.goto("." + path);
      await expect(page.locator("main")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      for (const position of [0, 700, 1400, 2500, 5000, 0]) {
        await page.evaluate(y => window.scrollTo(0, y), position);
        const layout = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          contentWidth: (document.querySelector("main .container") ?? document.querySelector("main"))!.getBoundingClientRect().width,
          offenders: Array.from(document.querySelectorAll("main *"))
            .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && getComputedStyle(el).position !== "absolute"; })
            .slice(0, 5).map(el => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width })),
        }));
        expect(Math.max(layout.document, layout.body), `${path} at ${width}px: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(width + 1);
        // No horizontal overflow is insufficient: a collapsed content column
        // can leave most of the screen blank and still pass that check.
        expect(layout.contentWidth, `${path} collapsed at ${width}px`).toBeGreaterThanOrEqual(width * 0.9);
      }
      const input = page.locator('main input:not([type="hidden"])').first();
      if (await input.count()) {
        await input.focus();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      }
    }
  }
});
