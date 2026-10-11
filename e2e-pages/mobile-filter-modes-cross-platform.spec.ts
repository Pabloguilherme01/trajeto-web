import { expect, test } from "@playwright/test";

// Both devices exercise the GitHub Pages base path without fetching map tiles
// or involving the PWA worker. Offline installation has separate coverage.
test.use({ serviceWorkers: "block" });

test("Android/iOS: station Premium modes remain touchable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("postos?q=postos", { waitUntil: "domcontentloaded" });
  const rail = page.getByRole("group", { name: "Modos de filtro dos postos" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("button")).toHaveCount(4);

  const all = rail.getByRole("button", { name: /^Todos\b/ });
  const route = rail.getByRole("button", { name: /^Com rota\b/ });
  const anp = rail.getByRole("button", { name: /^Dados ANP\b/ });
  await expect(all).toHaveAttribute("aria-pressed", "true");
  await route.click();
  await expect(route).toHaveAttribute("aria-pressed", "true");
  await expect(all).toHaveAttribute("aria-pressed", "false");
  await anp.click();
  await expect(anp).toHaveAttribute("aria-pressed", "true");
  await expect(route).toHaveAttribute("aria-pressed", "false");

  const heights = await rail.getByRole("button").evaluateAll(
    buttons => buttons.map(button => button.getBoundingClientRect().height),
  );
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

  // A 16px input avoids unintentional zoom when iOS Safari focuses it.
  const search = page.getByRole("textbox", { name: "Buscar postos" });
  await search.scrollIntoViewIfNeeded();
  expect(await search.evaluate(input => parseFloat(getComputedStyle(input).fontSize)))
    .toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});

test("Android/iOS: service modes preserve URL, semantics and mobile grid", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("servicos", { waitUntil: "domcontentloaded" });
  const group = page.getByRole("group", { name: "Recursos disponíveis" });
  await expect(group).toBeVisible();
  await expect(group.getByRole("button")).toHaveCount(4);

  const all = group.getByRole("button", { name: "Ver tudo" });
  const online = group.getByRole("button", { name: "Resolver online" });
  const contact = group.getByRole("button", { name: "Ligar ou WhatsApp" });
  await expect(all).toHaveAttribute("aria-pressed", "true");

  await online.click();
  await expect(page).toHaveURL(/recurso=online/);
  await expect(online).toHaveAttribute("aria-pressed", "true");
  await contact.click();
  await expect(page).toHaveURL(/recurso=contato/);
  await expect(contact).toHaveAttribute("aria-pressed", "true");
  await all.click();
  await expect(all).toHaveAttribute("aria-pressed", "true");
  expect(new URL(page.url()).searchParams.has("recurso")).toBe(false);

  const heights = await group.getByRole("button").evaluateAll(
    buttons => buttons.map(button => button.getBoundingClientRect().height),
  );
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

  const search = page.getByRole("textbox", { name: "Buscar serviços públicos" });
  expect(await search.evaluate(input => parseFloat(getComputedStyle(input).fontSize)))
    .toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(321);
  expect(errors).toEqual([]);
});
