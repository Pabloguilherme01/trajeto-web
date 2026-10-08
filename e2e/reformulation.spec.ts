import { test, expect } from '@playwright/test';

test('editable home search opens the relevant results', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'O que você procura?' }).fill('UPA');
  await page.getByRole('button', { name: 'Buscar no Trajeto' }).click();
  await expect(page).toHaveURL(/buscar\?q=UPA/);
  await expect(page.getByText(/UPA/).first()).toBeVisible();
});

test('specific service prioritizes hours, contact and route at 200 percent text size', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/servicos?servico=upa-mansoes-odisseia');
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
