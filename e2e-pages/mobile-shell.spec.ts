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

    const undersizedMainButtons = await page.locator("main button").evaluateAll(buttons =>
      buttons.flatMap(button => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) return [];
        const iconOnly = !(button.textContent || "").trim();
        if (rect.height < 43.5 || (iconOnly && rect.width < 43.5)) {
          return [{ label: button.getAttribute("aria-label") || button.textContent?.trim() || "button", width: rect.width, height: rect.height }];
        }
        return [];
      })
    );
    expect(undersizedMainButtons, path || "home").toEqual([]);

    const tinyVisibleText = await page.locator("main").evaluate(root =>
      [...root.querySelectorAll("p, span, a, button, label, summary, h1, h2, h3")]
        .flatMap(element => {
          const text = (element.textContent || "").trim();
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (!text || rect.width === 0 || rect.height === 0 || style.display === "none" || style.visibility === "hidden") return [];
          const size = parseFloat(style.fontSize);
          return size < 11.9 ? [{ text: text.slice(0, 80), size }] : [];
        })
        .slice(0, 12)
    );
    expect(tinyVisibleText, `${path || "home"} tiny text`).toEqual([]);

    const clippedPrimaryText = await page.locator("main").evaluate(root =>
      [...root.querySelectorAll("h1, h2, h3, button")]
        .flatMap(element => {
          const text = (element.textContent || "").trim();
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (!text || rect.width === 0 || rect.height === 0 || style.display === "none" || style.visibility === "hidden") return [];
          const horizontallyClipped = element.scrollWidth > element.clientWidth + 1;
          const verticallyClipped = element.scrollHeight > element.clientHeight + 1;
          return horizontallyClipped || verticallyClipped
            ? [{ text: text.slice(0, 80), width: element.clientWidth, scrollWidth: element.scrollWidth, height: element.clientHeight, scrollHeight: element.scrollHeight }]
            : [];
        })
        .slice(0, 12)
    );
    expect(clippedPrimaryText, `${path || "home"} clipped text`).toEqual([]);

    for (const button of await nav.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box, path || "home").not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("Pages: search stays useful while the keyboard is open and restores the dock after submit", async ({
  page,
}) => {
  await page.goto("buscar", { waitUntil: "domcontentloaded" });
  const nav = page.getByRole("navigation", { name: "Navegação móvel" });
  const input = page.getByRole("textbox", { name: "Buscar locais e serviços" });

  await input.focus();
  await expect(nav).toBeHidden();
  await input.fill("dengue");
  await expect(page.getByText("Vigilância em Saúde", { exact: true })).toBeVisible();
  await expect(page.getByText(/resultado\(s\) para “dengue”/i)).toBeVisible();

  await input.press("Enter");
  await expect(nav).toBeVisible();
  await expect(page).toHaveURL(/buscar\?q=dengue/);

  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(page.getByRole("heading", { name: "O que você quer resolver?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Dengue e Vigilância/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Conselho Tutelar/i })).toBeVisible();
});

test("Pages: More and accessibility behave as bottom sheets on a small phone", async ({
  page,
}) => {
  await page.goto("", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Mais opções" }).click();
  const more = page.getByRole("dialog");
  await expect(more).toBeVisible();
  await expect.poll(async () => {
    const box = await more.boundingBox();
    return box ? Math.abs(box.y + box.height - 568) : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(1);
  const moreBox = await more.boundingBox();
  expect(moreBox).not.toBeNull();
  expect(moreBox!.x).toBeGreaterThanOrEqual(-0.5);
  expect(moreBox!.x + moreBox!.width).toBeLessThanOrEqual(320.5);
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


test("Pages: large text preference still fits a 320px phone", async ({ page }) => {
  await page.addInitScript(() => {
    document.documentElement.classList.add("a11y-large");
  });

  for (const path of ["", "buscar", "servicos", "planejar", "postos"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(metrics.scrollWidth, path || "home").toBeLessThanOrEqual(metrics.clientWidth + 1);

    const clipped = await page.locator("main").evaluate(root =>
      [...root.querySelectorAll("h1, h2, h3, button")]
        .flatMap(element => {
          const text = (element.textContent || "").trim();
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (!text || rect.width === 0 || rect.height === 0 || style.display === "none" || style.visibility === "hidden") return [];
          return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
            ? [text.slice(0, 80)]
            : [];
        })
        .slice(0, 12)
    );
    expect(clipped, path || "home").toEqual([]);
  }
});
