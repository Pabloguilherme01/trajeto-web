import { expect, test } from "@playwright/test";

// Cobertura visual e de rótulos baseada no cálculo local — os preços são
// exemplos de teste, não preços reais de postos ou dados ANP.
for (const width of [320, 390]) {
  test(`Pages: comparador de combustíveis respeita a ordem declarada a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("planejar?experiencia=economy");
    const calculator = page.locator('section[aria-labelledby="local-calculator-title"]');
    await expect(calculator).toBeVisible();

    await calculator.getByPlaceholder("5,89").fill("6,09");
    await calculator.getByPlaceholder("10,5").fill("12");
    await calculator.getByText("Ajustes avançados", { exact: true }).click();

    await calculator.getByPlaceholder("Ex.: 5,49").fill("4,19");
    await calculator.getByPlaceholder("Ex.: 8,5").fill("8");

    const order = calculator.getByLabel("Tipo de comparação");
    await expect(order).toHaveValue("generic");
    await expect(calculator.getByText("Etanol tem o menor custo estimado.", { exact: true })).toHaveCount(0);
    await expect(calculator.getByText("Gasolina tem o menor custo estimado.", { exact: true })).toHaveCount(0);
    await expect(calculator.getByText(/O segundo cenário custa/)).toBeVisible();

    await order.selectOption("gasoline-first");
    await expect(calculator.getByText("Gasolina tem o menor custo estimado.", { exact: true })).toBeVisible();
    await order.selectOption("ethanol-first");
    await expect(calculator.getByText("Etanol tem o menor custo estimado.", { exact: true })).toBeVisible();

    const selectBox = await order.boundingBox();
    expect(selectBox?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    await calculator.getByRole("button", { name: "Limpar cálculo" }).click();
    await expect(order).toHaveValue("generic");
    await expect(calculator.getByText("Etanol tem o menor custo estimado.", { exact: true })).toHaveCount(0);
  });
}
