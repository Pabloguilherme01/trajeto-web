import { expect, test } from "@playwright/test";

test("calculator recovers a malformed saved scenario and remains usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("trajeto-trip-calculator-draft", JSON.stringify({
      distance: 20, price: "6", consumption: {}, currentFuel: true,
      roundTrip: "false", recurring: "false", tripsPerWeek: -2,
    }));
  });
  await page.goto("planejar?economia=1");
  const calculator = page.getByRole("region", { name: "Quanto custa ir?" });
  await expect(calculator).toBeVisible();
  await expect(calculator.getByPlaceholder("5,89")).toHaveValue("6");
  await calculator.getByPlaceholder("35").fill("20");
  await calculator.getByPlaceholder("10,5").fill("10");
  await expect(calculator.locator("p.text-xl")).toHaveText(/R\$\s*12,00/);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});
