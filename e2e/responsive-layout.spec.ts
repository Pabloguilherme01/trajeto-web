import { expect, test } from "@playwright/test";

for (const width of [280, 320, 360, 390, 768]) {
  test(`public screens stay inside the viewport before and after scrolling and focusing inputs at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "chromium-mobile",
      "This matrix sets its own 280–768px viewports; run it once on Chromium instead of duplicating the same matrix."
    );
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 740 });
    for (const path of ["/", "/planejar", "/servicos", "/mapa", "/ajuda"]) {
      // This suite checks responsive layouts, not the loading of every image
      // or third-party resource. Firefox can leave window.load pending while
      // the page itself is already interactive on slower CI workers.
      await page.goto("." + path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      for (const position of [0, 700, 1400, 2500, 5000, 0]) {
        await test.step(`scroll ${path} at ${width}px to y=${position}`, async () => {
          await page.evaluate(y => window.scrollTo(0, y), position);
        });
        const layout = await page.evaluate(() => {
          const overflowing =
            Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth
            ) >
            document.documentElement.clientWidth + 1;
          return {
            viewport: document.documentElement.clientWidth,
            document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth,
            contentWidth: (document.querySelector("main .container") ??
              document.querySelector("main"))!.getBoundingClientRect().width,
            // Inspect individual nodes only on failure. Maps contain thousands of
            // SVG elements; reading every bounding box at every step slows QA.
            offenders: overflowing
              ? Array.from(document.querySelectorAll("main *"))
                  .filter(el => {
                    const r = el.getBoundingClientRect();
                    return (
                      r.width > 0 &&
                      r.right > document.documentElement.clientWidth + 1 &&
                      getComputedStyle(el).position !== "absolute"
                    );
                  })
                  .slice(0, 5)
                  .map(el => ({
                    tag: el.tagName,
                    class: el.className,
                    width: el.getBoundingClientRect().width,
                  }))
              : [],
          };
        });
        expect(
          Math.max(layout.document, layout.body),
          `${path} at ${width}px: ${JSON.stringify(layout)}`
        ).toBeLessThanOrEqual(width + 1);
        // No horizontal overflow is insufficient: a collapsed content column
        // can leave most of the screen blank and still pass that check.
        expect(
          layout.contentWidth,
          `${path} collapsed at ${width}px`
        ).toBeGreaterThanOrEqual(width * 0.9);
      }
      const input = page.locator('main input:not([type="hidden"])').first();
      if (await input.count()) {
        await input.focus();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth)
        ).toBeLessThanOrEqual(width + 1);
      }
    }
  });
}

test("home remains usable with enlarged text on a narrow installed-app-like viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("./");
  await page.addStyleTag({ content: "html { font-size: 20px !important; }" });
  await expect(page.locator("main")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(layout.document, layout.body)).toBeLessThanOrEqual(
    layout.viewport + 1
  );
  await expect(
    page.getByRole("button", { name: /planejar|rota|buscar/i }).first()
  ).toBeVisible();
});
