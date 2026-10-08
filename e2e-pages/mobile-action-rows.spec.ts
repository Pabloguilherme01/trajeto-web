import { expect, test, type Locator } from "@playwright/test";

async function expectRow(actions: Locator[]) {
  for (const action of actions) await expect(action).toBeVisible();
  // Cards animate into place. Measure settled bounds without weakening touch targets.
  await expect(async () => {
    const boxes = await Promise.all(actions.map(async action => (await action.boundingBox())!));
    for (const box of boxes) {
      expect(Math.abs(box.y - boxes[0].y)).toBeLessThanOrEqual(1);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width);
    }
  }).toPass({ timeout: 8_000 });
}

for (const width of [320, 360, 390]) {
  test(`Central action pairs stay horizontal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("servicos?servico=upa-mansoes-odisseia");
    const group = page.locator("#service-upa-mansoes-odisseia").getByRole("group", { name: "Ações principais do serviço" });
    const actions = group.locator(":scope > button, :scope > a");
    await expect(actions).toHaveCount(2);
    await expectRow([actions.nth(0), actions.nth(1)]);
    const more = page.locator("#service-upa-mansoes-odisseia").getByRole("group", { name: "Outras ações do serviço" }).getByRole("button");
    await expect(more).toHaveCount(2);
    await expectRow([more.nth(0), more.nth(1)]);
    await page.goto("servicos");
    await page.locator("#service-filters summary").click();
    const resources = page.getByRole("group", { name: "Recursos disponíveis" }).getByRole("button");
    await expectRow([resources.nth(0), resources.nth(1)]);
    await expectRow([resources.nth(2), resources.nth(3)]);
    await expectRow(["190", "192", "193"].map(number => page.locator("#emergency-strip").locator('a[href="tel:' + number + '"]')));
    await page.goto("servicos?q=UPA&categoria=saude");
    const card = page.locator("#service-upa-mansoes-odisseia");
    await card.locator("summary").filter({ hasText: "Mais opções" }).click();
    await expectRow([
      card.getByRole("button", { name: "Abrir UPA Mansões Odisseia no Organic Maps", exact: true }),
      card.getByRole("button", { name: "Compartilhar serviço: UPA Mansões Odisseia", exact: true }),
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });

  test(`Planner navigation apps stay in one row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("planejar?destino=Prefeitura");
    await page.locator("summary").filter({ hasText: "Navegar com outro aplicativo" }).click();
    await expectRow([
      page.getByRole("button", { name: "Abrir Google Maps agora", exact: true }),
      page.getByRole("button", { name: "Abrir Waze agora", exact: true }),
      page.getByRole("button", { name: "Abrir Apple Maps agora", exact: true }),
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
