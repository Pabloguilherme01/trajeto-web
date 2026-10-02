import { expect, test } from "@playwright/test";

test("Pages: standalone interface checks updates without losing saved data and remains usable offline", async ({ page, context }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 360, height: 740 });
  // Emulate display-mode only; the worker, cache and network are real.
  await page.addInitScript(() => {
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = query => {
      const result = matchMedia(query);
      if (query === "(display-mode: standalone)") Object.defineProperty(result, "matches", { value: true });
      return result;
    };
  });
  await page.goto("", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Resolva na cidade/ })).toBeVisible();
  await expect(page.getByText("Baixe o Trajeto no celular")).toHaveCount(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    localStorage.setItem("trajeto-update-preservation-test", "keep");
  });
  await page.goto("ajuda", { waitUntil: "domcontentloaded" });
  const check = page.getByRole("button", { name: "Verificar e atualizar aplicativo" });
  await check.click();
  await expect(page.getByText("Você está com a versão mais recente disponível.")).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => localStorage.getItem("trajeto-update-preservation-test"))).toBe("keep");
  await context.setOffline(true);
  await check.click();
  await expect(page.getByText("Conecte-se à internet para verificar atualizações.")).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(check).toBeVisible();
  expect(await page.locator("main .container").evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(324);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
