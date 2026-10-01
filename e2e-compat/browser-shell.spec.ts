import { expect, test } from "@playwright/test";

const corePaths = ["", "buscar", "servicos", "planejar", "postos", "ajuda"];
const responsiveSizes = [
  { width: 320, height: 568, label: "phone-narrow" },
  { width: 360, height: 640, label: "phone-compact" },
  { width: 390, height: 844, label: "phone-standard" },
  { width: 430, height: 932, label: "phone-large" },
  { width: 844, height: 390, label: "phone-landscape" },
  { width: 768, height: 1024, label: "tablet" },
  { width: 1024, height: 768, label: "desktop-compact" },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "trajeto-install-dismissed-until",
      String(Date.now() + 86_400_000),
    );
  });
});

test("core public flows do not overflow and forms remain zoom-safe", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  for (const path of corePaths) {
    await page.goto(path, { waitUntil: "domcontentloaded" });

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflowers = metrics.scrollWidth > metrics.clientWidth + 1
      ? await page.locator("body *").evaluateAll((elements, viewportWidth) =>
          elements.flatMap(element => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              (rect.right <= viewportWidth + 1 && rect.left >= -1)
            ) return [];
            return [{
              tag: element.tagName.toLowerCase(),
              className: element.getAttribute("class") || "",
              text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 80),
              left: Math.round(rect.left * 10) / 10,
              right: Math.round(rect.right * 10) / 10,
              width: Math.round(rect.width * 10) / 10,
            }];
          }).slice(0, 8),
        metrics.clientWidth)
      : [];
    expect(
      metrics.scrollWidth,
      `${path || "home"} overflowers: ${JSON.stringify(overflowers)}`,
    ).toBeLessThanOrEqual(metrics.clientWidth + 1);

    const fields = page.locator("input:visible, select:visible, textarea:visible");
    const fieldCount = await fields.count();
    for (let index = 0; index < fieldCount; index += 1) {
      const fontSize = await fields.nth(index).evaluate(element =>
        parseFloat(getComputedStyle(element).fontSize),
      );
      expect(fontSize, `${path || "home"} field ${index}`).toBeGreaterThanOrEqual(16);
    }

    if ((await page.viewportSize())!.width < 768) {
      const mobileNav = page.getByRole("navigation", { name: "Navegação móvel" });
      await expect(mobileNav).toBeVisible();
      const box = await mobileNav.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-0.5);
      expect(box!.x + box!.width).toBeLessThanOrEqual((await page.viewportSize())!.width + 0.5);

      const typography = await page.locator("main").evaluate(root => {
        const visible = [...root.querySelectorAll("p, span, a, button, label, summary, h1, h2, h3")]
          .filter(element => {
            const text = (element.textContent || "").trim();
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return Boolean(text) && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
          });
        const tiny = visible
          .flatMap(element => {
            const size = parseFloat(getComputedStyle(element).fontSize);
            return size < 11.9 ? [{ text: (element.textContent || "").trim().slice(0, 60), size }] : [];
          })
          .slice(0, 8);
        const h1 = root.querySelector("h1");
        const h1Size = h1 ? parseFloat(getComputedStyle(h1).fontSize) : null;
        const clippedButtons = visible
          .filter(element => element.tagName === "BUTTON")
          .flatMap(element =>
            element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
              ? [(element.textContent || "").trim().slice(0, 60)]
              : []
          )
          .slice(0, 8);
        return { tiny, h1Size, clippedButtons };
      });
      expect(typography.tiny, `${path || "home"} tiny text`).toEqual([]);
      if (typography.h1Size != null) {
        expect(typography.h1Size, `${path || "home"} h1 too small`).toBeGreaterThanOrEqual(30);
        expect(typography.h1Size, `${path || "home"} h1 too large`).toBeLessThanOrEqual(48);
      }
      expect(typography.clippedButtons, `${path || "home"} clipped buttons`).toEqual([]);
    } else {
      await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
    }
  }

  expect(pageErrors).toEqual([]);
});

test("representative screen sizes keep the shell inside the viewport", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "compat-chromium-android",
    "Viewport matrix runs once; browser differences are covered by the other projects.",
  );

  for (const size of responsiveSizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("", { waitUntil: "domcontentloaded" });

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(metrics.scrollWidth, size.label).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.bodyWidth, size.label).toBeLessThanOrEqual(metrics.clientWidth + 1);

    if (size.width < 768) {
      const nav = page.getByRole("navigation", { name: "Navegação móvel" });
      await expect(nav).toBeVisible();
      const buttons = nav.getByRole("button");
      for (let index = 0; index < await buttons.count(); index += 1) {
        const box = await buttons.nth(index).boundingBox();
        expect(box, `${size.label} nav button ${index}`).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    } else {
      const nav = page.getByRole("navigation", { name: "Navegação principal" });
      await expect(nav).toBeVisible();
      const links = nav.getByRole("link");
      for (let index = 0; index < await links.count(); index += 1) {
        const box = await links.nth(index).boundingBox();
        expect(box, `${size.label} nav link ${index}`).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

test("mobile sheets remain reachable in portrait and landscape", async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("", { waitUntil: "domcontentloaded" });

    if (viewport.width < 768) {
      await page.getByRole("button", { name: "Mais opções" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-0.5);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 0.5);
      await page.getByRole("button", { name: "Fechar menu" }).click();
    } else {
      await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
    }
  }
});
