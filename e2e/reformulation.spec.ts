import { test, expect } from '@playwright/test';

test('editable home search opens the relevant results', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('./');
  await page.getByRole('textbox', { name: 'O que você procura?' }).fill('UPA');
  await page.getByRole('button', { name: 'Buscar no Trajeto' }).click();
  await expect(page).toHaveURL(/buscar\?q=UPA/);
  await expect(page.getByText(/UPA/).first()).toBeVisible();
});

test('specific service prioritizes hours, contact and route at 200 percent text size', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('./servicos?servico=upa-mansoes-odisseia');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expect(page.getByRole('heading', { name: 'Como podemos ajudar?' })).toHaveCount(0);
  const card = page.locator('#service-upa-mansoes-odisseia');
  await expect(card.getByRole('button', { name: 'Planejar rota', exact: true })).toBeVisible();
  await expect(card.getByText(/24 horas/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const dock = page.getByRole('navigation', { name: 'Navegação móvel' });
  for (const button of await dock.getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});


test("station Premium modes reveal selection inside their rail at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("./mapa/postos");
  const rail = page.getByRole("group", { name: "Modos de filtro dos postos" });
  await expect(rail).toBeVisible();
  await rail.scrollIntoViewIfNeeded();
  for (const button of await rail.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(152);
    expect(box!.height).toBeLessThan(150);
  }
  const address = rail.getByRole("button", { name: /Endereço/ });
  const pagePosition = await page.evaluate(() => scrollY);
  // An external state change must reveal the mode without browser click scrolling.
  await address.evaluate((button: HTMLButtonElement) => button.click());
  await expect(address).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => address.evaluate(button => {
    const item = button.getBoundingClientRect();
    const row = button.parentElement!.getBoundingClientRect();
    return item.left >= row.left && item.right <= row.right + 1;
  })).toBe(true);
  expect(await page.evaluate(() => scrollY)).toBe(pagePosition);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await address.evaluate((button: HTMLButtonElement) => button.focus({ preventScroll: true }));
  await expect(address).toBeFocused();
  const all = rail.getByRole("button", { name: /Todos/ });
  await all.evaluate((button: HTMLButtonElement) => button.click());
  await expect(all).toHaveAttribute("aria-pressed", "true");
  await expect(address).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => all.evaluate(button => {
    const item = button.getBoundingClientRect();
    const row = button.parentElement!.getBoundingClientRect();
    return item.left >= row.left && item.right <= row.right + 1;
  })).toBe(true);
});
