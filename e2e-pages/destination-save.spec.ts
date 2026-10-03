import { expect, test } from "@playwright/test";

test("destination save explains storage failure and recovers at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "trajeto-unified-destination-favorites" && !(window as any).__allowDestinationSave) throw new DOMException("Blocked", "QuotaExceededError");
      return write.call(this, key, value);
    };
  });
  await page.goto("mapa", { waitUntil: "domcontentloaded" });
  const card = page.getByRole("article").filter({ has: page.getByText("UPA", { exact: true }) });
  await card.getByRole("button", { name: "Salvar destino", exact: true }).click();
  await expect(card.getByRole("alert")).toContainText("Não foi possível atualizar os salvos");
  await expect(card.getByRole("button", { name: "Salvar destino", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.evaluate(() => { (window as any).__allowDestinationSave = true; });
  await card.getByRole("button", { name: "Salvar destino", exact: true }).click();
  await expect(card.getByRole("alert")).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Destino salvo", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(card.getByRole("button", { name: "Destino salvo", exact: true })).toHaveAttribute("aria-pressed", "true");
});
