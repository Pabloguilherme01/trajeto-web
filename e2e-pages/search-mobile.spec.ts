import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Pages: search uses the full mobile width and keeps results near the input", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "trajeto-install-dismissed-until",
      String(Date.now() + 86400000)
    )
  );
  await page.goto("buscar", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Encontre e vá." })
  ).toBeVisible();
  for (const width of [320, 360, 390, 412, 600, 767, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const form = await page.locator("main form").boundingBox();
    const essentials = await page.getByLabel("Ações essenciais").boundingBox();
    expect(Math.abs(form!.width - essentials!.width)).toBeLessThan(2);
    expect(form!.width).toBeGreaterThan(Math.min(width, 1024) - 70);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page
    .getByRole("button", {
      name: "Mais opções: postos, comércio e outras categorias",
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Educação", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Menos opções" }).click();
  await expect(
    page.getByRole("button", { name: "Educação", exact: true })
  ).not.toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar locais e serviços" })
    .fill("cras");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  const results = page.getByRole("region", { name: /^Serviços públicos/ });
  await expect(results.getByRole("button")).toHaveCount(3);
  const searchBox = await page.locator("main form").boundingBox();
  const resultsBox = await results.boundingBox();
  expect(resultsBox!.y - (searchBox!.y + searchBox!.height)).toBeLessThan(100);
  expect(Math.abs(resultsBox!.width - searchBox!.width)).toBeLessThan(2);
  await expect(
    page.getByRole("heading", {
      name: /Outros destinos|Lugares e comércio|Postos/,
    })
  ).toHaveCount(0);
  await page.evaluate(() =>
    document.documentElement.classList.add("a11y-large")
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(
    audit.violations.filter(
      item => item.impact === "critical" || item.impact === "serious"
    )
  ).toEqual([]);
});

test("Pages: offline search preserves direct contacts and explains an unknown query", async ({
  page,
  context,
}) => {
  await page.goto("buscar", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    )
    .toBe(true);
  await context.setOffline(true);
  await page.goto("buscar?q=cnis", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: /Meu INSS · benefícios e extratos/ })
    .click();
  await expect(page).toHaveURL(/servicos\?servico=meu-inss$/);
  await expect(
    page.getByRole("link", { name: /Ligar para Meu INSS/ })
  ).toHaveAttribute("href", "tel:135");
  await page.goto("buscar?q=nao-existe-xyz", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Nenhum resultado local/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Buscar no Google Maps · online" })
  ).toBeDisabled();
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(
    page.getByRole("heading", { name: "O que você precisa?" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Preparar acesso offline", exact: true })
  ).toHaveAttribute("href", /\/trajeto-web\/ajuda#offline-readiness-title$/);
});

test("Pages: offline preparation recovers a missing chunk and survives a reload", async ({
  page,
  context,
}) => {
  await page.goto("ajuda", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Pronto para usar sem internet neste aparelho.")
  ).toBeVisible();
  const missing = await page.evaluate(async () => {
    const names = await caches.keys();
    const current = names.find(
      name =>
        name.startsWith("trajeto-%2Ftrajeto-web%2F-") &&
        name.endsWith("-static")
    );
    if (!current) throw new Error("Missing installed package");
    const cache = await caches.open(current);
    const manifest = await (await cache.match("./offline-assets.json"))!.json();
    const entry = Object.entries(manifest).find(([key]) =>
      key.includes("Search.tsx")
    )?.[1] as { file: string } | undefined;
    if (!entry) throw new Error("Missing search entry");
    const url = new URL(entry.file, document.baseURI).href;
    await cache.delete(url, { ignoreVary: true });
    return { current, url };
  });
  await page.getByRole("button", { name: "Conferir acesso offline" }).click();
  await expect(
    page.getByRole("button", { name: "Preparar acesso offline" })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Preparar acesso offline" }).click();
  await expect(
    page.getByText("Pronto para usar sem internet neste aparelho.")
  ).toBeVisible();
  expect(
    await page.evaluate(
      async ({ current, url }) =>
        Boolean(await (await caches.open(current)).match(url)),
      missing
    )
  ).toBe(true);
  await context.setOffline(true);
  await page.goto("buscar?q=carteira%20de%20trabalho", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("button", { name: /Carteira de Trabalho Digital/ })
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: /Carteira de Trabalho Digital/ })
  ).toBeVisible();
});
