import { expect, test } from "@playwright/test";

const corePaths = ["", "buscar", "servicos", "planejar", "postos", "ajuda"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "trajeto-install-dismissed-until",
      String(Date.now() + 86400000)
    )
  );
  await page.setViewportSize({ width: 320, height: 568 });
});

test("Pages: core citizen flows stay inside a 320px viewport and keep the dock touchable", async ({
  page,
}) => {
  for (const path of corePaths) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const nav = page.getByRole("navigation", { name: "Navegação móvel" });
    await expect(nav).toBeVisible();

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth,
    }));
    expect(layout.scrollWidth, path || "home").toBeLessThanOrEqual(layout.innerWidth);

    const navBox = await nav.boundingBox();
    expect(navBox, path || "home").not.toBeNull();
    expect(navBox!.x).toBeGreaterThanOrEqual(0);
    expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(320.5);
    expect(navBox!.y + navBox!.height).toBeLessThanOrEqual(568.5);

    for (const button of await nav.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box, path || "home").not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("Pages: More and accessibility behave as bottom sheets on a small phone", async ({
  page,
}) => {
  await page.goto("", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Mais opções" }).click();
  const more = page.getByRole("dialog");
  await expect(more).toBeVisible();
  const moreBox = await more.boundingBox();
  expect(moreBox).not.toBeNull();
  expect(moreBox!.x).toBeGreaterThanOrEqual(-0.5);
  expect(moreBox!.x + moreBox!.width).toBeLessThanOrEqual(320.5);
  expect(Math.abs(moreBox!.y + moreBox!.height - 568)).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "Fechar menu" }).click();

  await page.getByRole("button", { name: "Abrir acessibilidade" }).click();
  const accessibility = page.getByRole("dialog", {
    name: "Acessibilidade e modo de uso",
  });
  await expect(accessibility).toBeVisible();
  const panel = accessibility.locator("section");
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.x).toBeGreaterThanOrEqual(-0.5);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(320.5);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(568.5);

  const minVisibleFont = await panel.evaluate(element => {
    const nodes = [...element.querySelectorAll("p, span, button, a")]
      .filter(node => node.textContent?.trim())
      .filter(node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });
    return Math.min(...nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  });
  expect(minVisibleFont).toBeGreaterThanOrEqual(12);

  const close = page.getByRole("button", { name: "Fechar acessibilidade" });
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  expect(
    await accessibility.evaluate(dialog => dialog.contains(document.activeElement))
  ).toBe(true);
});
