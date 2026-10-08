import { expect, test } from "@playwright/test";

for (const width of [320, 360, 390]) {
  for (const large of [false, true]) {
    test(`dock has four horizontal destinations at ${width}px, large text ${large}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("");
      if (large) await page.evaluate(() => document.documentElement.classList.add("a11y-large"));
      const dock = page.getByRole("navigation", { name: "Navegação móvel" });
      await expect(dock).toBeVisible();
      const buttons = dock.getByRole("button");
      await expect(buttons).toHaveCount(4);
      await expect(async () => {
        const boxes = await buttons.evaluateAll(elements => elements.map(element => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }));
        for (let index = 0; index < boxes.length; index++) {
          expect(Math.abs(boxes[index].y - boxes[0].y)).toBeLessThanOrEqual(1);
          expect(boxes[index].width).toBeGreaterThanOrEqual(44);
          expect(boxes[index].height).toBeGreaterThanOrEqual(44);
          if (index) expect(boxes[index].x).toBeGreaterThanOrEqual(boxes[index - 1].x + boxes[index - 1].width);
        }
      }).toPass();
      const panel = page.locator("details").filter({ has: page.locator("summary", { hasText: "Planejar uma rota" }) }).first();
      await expect(panel).not.toHaveAttribute("open");
      expect((await panel.boundingBox())!.height).toBeLessThan(85);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: testInfo.outputPath(`home-${width}-${large}.png`) });
    });
  }
}
