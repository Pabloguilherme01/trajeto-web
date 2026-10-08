import { expect, type Page } from "@playwright/test";

export async function waitForOfflinePackage(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await expect
    .poll(
      () => page.evaluate(() => document.documentElement.dataset.offlinePackageReady),
      { timeout: 120000 },
    )
    .toBe("true");
}
