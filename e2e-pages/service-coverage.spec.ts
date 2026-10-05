import { expect, test, type Page } from "@playwright/test";

const officialUrl =
  "https://www.gov.br/receitafederal/pt-br/canais_atendimento/fale-conosco/presencial/go/aguas-lindas-de-goias";
const cases = [
  {
    id: "receita-federal-pav",
    name: "Receita Federal · ponto conveniado",
    queries: ["Receita Federal", "CPF", "CNPJ", "imposto de renda"],
  },
  {
    id: "defesa-civil",
    name: "Proteção e atendimento de emergência",
    queries: [
      "Defesa Civil",
      "alagamento",
      "enchente",
      "desabamento",
      "risco estrutural",
    ],
  },
];

async function checkCard(page: Page, id: string, name: string) {
  const cards = page
    .getByRole("region", { name: "Serviços públicos" })
    .getByRole("article");
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(cards.getByText("Endereço:", { exact: true })).toHaveCount(0);
  await expect(
    cards.getByRole("button", { name: "Rota", exact: true })
  ).toHaveCount(0);
  await expect(
    cards.locator(
      'a[href*="wa.me"], a[href*="maps.google"], a[href*="google.com/maps"]'
    )
  ).toHaveCount(0);
  if (id === "receita-federal-pav") {
    await expect(cards.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(
      cards.getByRole("link", {
        name: "Consultar atendimento oficial · online",
      })
    ).toHaveAttribute("href", officialUrl);
    await expect(
      cards.getByRole("link", {
        name: "Fonte: Receita Federal · conferido em 01/10/2026",
      })
    ).toHaveAttribute("href", officialUrl);
  } else {
    await expect(cards.locator('a[href^="tel:"]')).toHaveCount(2);
    await expect(cards.locator('a[href="tel:193"]')).toHaveCount(1);
    await expect(cards.locator('a[href="tel:190"]')).toHaveCount(1);
    await expect(
      cards.getByRole("link", { name: /Polícia · emergência policial/ })
    ).toHaveAttribute("href", "tel:190");
    await expect(
      cards.getByRole("link", { name: /Bombeiros · resgate e salvamento/ })
    ).toHaveAttribute("href", "tel:193");
    await expect(cards.getByText(/Alternativo/)).toHaveCount(0);
    await expect(
      cards.getByText(
        "Use 193 para incêndio, resgate e salvamento e 190 para emergência policial.",
        { exact: true }
      )
    ).toBeVisible();
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
}

test("Pages: planner excludes unverified utility routes but keeps the official contact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("planejar", { waitUntil: "domcontentloaded" });
  await page.locator("summary").filter({ hasText: "Destinos e atalhos" }).click();
  await page.getByRole("button", { name: /Destinos disponíveis/ }).click();
  await page
    .getByRole("textbox", { name: "Filtrar todos os destinos disponíveis" })
    .fill("Saneago");
  await expect(
    page.getByText("Nenhum destino corresponde ao filtro.")
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
  await page.goto("servicos?servico=saneago", {
    waitUntil: "domcontentloaded",
  });
  const card = page
    .getByRole("region", { name: "Serviços públicos" })
    .getByRole("article");
  await expect(
    card.getByRole("heading", { name: "Saneago · água e esgoto" })
  ).toBeVisible();
  await expect(card.locator('a[href="tel:08006450115"]')).toHaveCount(1);
  await expect(
    card.getByRole("button", { name: "Rota", exact: true })
  ).toHaveCount(0);
});

for (const service of cases) {
  test(`Pages: ${service.id} searches and contact safeguards survive offline reload at 320px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    for (const query of service.queries) {
      await page.goto(`buscar?q=${encodeURIComponent(query)}`, {
        waitUntil: "domcontentloaded",
      });
      await page
        .getByRole("button", { name: service.name, exact: false })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/trajeto-web/servicos\\?servico=${service.id}$`)
      );
      await checkCard(page, service.id, service.name);
    }
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller))
      )
      .toBe(true);
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await checkCard(page, service.id, service.name);
    for (const query of service.queries) {
      // A new offline navigation exercises the cached Pages shell and both search paths.
      await page.goto(`buscar?q=${encodeURIComponent(query)}`, {
        waitUntil: "domcontentloaded",
      });
      await page
        .getByRole("button", { name: service.name, exact: false })
        .click();
      await checkCard(page, service.id, service.name);
      await page
        .getByRole("button", { name: "Ver todos os serviços", exact: true })
        .click();
      const input = page.getByRole("textbox", {
        name: "Buscar serviços públicos",
      });
      await input.fill(query);
      await input.press("Enter");
      await checkCard(page, service.id, service.name);
    }
  });
}
