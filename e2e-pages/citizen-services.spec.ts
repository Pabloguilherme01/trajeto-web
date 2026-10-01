import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Pages: saved public services persist and reopen offline", async ({
  page,
  context,
}) => {
  await page.goto("servicos?servico=sic", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Serviço de Informação ao Cidadão · SIC",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Serviços públicos" }).getByRole("article")
  ).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Salvar serviço: Serviço de Informação ao Cidadão · SIC",
      exact: true,
    })
    .click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", {
      name: "Remover dos salvos: Serviço de Informação ao Cidadão · SIC",
    })
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Ver todos os serviços" }).click();
  await page
    .getByRole("button", { name: "Serviços salvos (1)", exact: true })
    .click();
  await expect(page).toHaveURL(/servicos\?salvos=1$/);
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
  await expect(
    page.getByRole("heading", {
      name: "Serviço de Informação ao Cidadão · SIC",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ligar para Serviço de Informação/ })
  ).toHaveAttribute("href", "tel:61993063637");
  await page
    .getByRole("button", {
      name: "Remover dos salvos: Serviço de Informação ao Cidadão · SIC",
    })
    .click();
  await expect(page.getByText("Nenhum serviço salvo ainda.")).toBeVisible();
});

test("Pages: blocked storage never claims to save a service", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "trajeto:public-service-favorites:v1")
        throw new DOMException("Full", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.goto("servicos?servico=sic", { waitUntil: "domcontentloaded" });
  const save = page.getByRole("button", {
    name: "Salvar serviço: Serviço de Informação ao Cidadão · SIC",
    exact: true,
  });
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByText(
      "Não foi possível guardar o serviço. Confira o espaço e as permissões do navegador."
    )
  ).toBeVisible();
});

test("Pages: department calls and emergency contacts fit small screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("servicos?servico=secretaria-fazenda", {
    waitUntil: "domcontentloaded",
  });
  const card = page
    .getByRole("region", { name: "Serviços públicos" })
    .getByRole("article");
  await expect(card.locator('a[href^="tel:"]')).toHaveCount(1);
  await expect(card.getByRole("link", { name: /ITBI/ })).toHaveAttribute(
    "href",
    "https://wa.me/5561920053453"
  );
  await expect(
    card.getByRole("link", { name: /Nota Fiscal\/ISS/ })
  ).toHaveAttribute("href", "https://wa.me/5561993057551");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
  const results = await new AxeBuilder({ page }).include("main").analyze();
  expect(
    results.violations.filter(
      item => item.impact === "critical" || item.impact === "serious"
    )
  ).toEqual([]);
});

test("Pages: national support opens directly from universal search", async ({
  page,
}) => {
  await page.goto("buscar?q=180", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: /Ligue 180 · atendimento à mulher/ })
    .click();
  await expect(page).toHaveURL(/servicos\?servico=ligue-180$/);
  await expect(
    page.getByRole("link", { name: /Ligar para Ligue 180/ })
  ).toHaveAttribute("href", "tel:180");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { sharedContact: string }).sharedContact =
            value;
        },
      },
    });
  });
  await page
    .getByRole("button", {
      name: "Compartilhar serviço: Ligue 180 · atendimento à mulher",
      exact: true,
    })
    .click();
  const shared = await page.evaluate(
    () => (window as unknown as { sharedContact: string }).sharedContact
  );
  expect(shared).toContain("Telefone: 180");
  expect(shared).toContain("/trajeto-web/servicos?servico=ligue-180");
  expect(shared).toContain("https://www.gov.br/mulheres/pt-br/ligue180");
  await expect(
    page
      .getByRole("region", { name: "Serviços públicos" })
      .getByRole("button", { name: "Rota", exact: true })
  ).toHaveCount(0);
  await page.goto("servicos?servico=unknown", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByText(
      "Este serviço não está no catálogo atual. Consulte os serviços disponíveis abaixo."
    )
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ligue 180 · atendimento à mulher" })
  ).toBeVisible();
});

test("Pages: daily need shortcuts and new assistance contacts work offline", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("servicos", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "O que você precisa resolver?" })
  ).toBeVisible();
  await page.getByRole("button", { name: /CadÚnico e benefícios/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Cadastro Único / Bolsa Família",
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ligar para Cadastro Único/ })
  ).toHaveAttribute("href", "tel:61993029284");
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
  await expect(
    page.getByRole("heading", {
      name: "Cadastro Único / Bolsa Família",
      exact: true,
    })
  ).toBeVisible();
  const input = page.getByRole("textbox", { name: "Buscar serviços públicos" });
  await input.fill("segunda via da conta de agua");
  await input.press("Enter");
  await expect(
    page.getByRole("region", { name: "Serviços públicos" }).getByRole("article")
  ).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Saneago · água e esgoto", exact: true })
  ).toBeVisible();
  await input.fill("cras");
  await input.press("Enter");
  await expect(
    page.getByRole("region", { name: "Serviços públicos" }).getByRole("article")
  ).toHaveCount(3);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
  await page
    .getByRole("region", { name: "Serviços públicos" })
    .getByRole("article")
    .filter({ hasText: "CRAS II · Santa Lúcia" })
    .getByRole("button", { name: "Rota", exact: true })
    .click();
  await expect(page).toHaveURL(/planejar\?destino=CRAS%20II/);
});


test("Pages: universal search retains the query when opening all service results", async ({ page }) => {
  await page.goto("buscar?q=ESF", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Ver todos os \d+ serviços encontrados/ }).click();
  await expect(page).toHaveURL(/servicos\?q=ESF$/);
  await expect(page.getByRole("heading", { name: "ESF Setor 09", exact: true })).toBeVisible();
});
