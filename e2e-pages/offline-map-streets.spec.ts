import { expect, test } from "@playwright/test";
test("Pages: city streets and controls survive an offline reload without external map requests", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("mapa");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    )
    .toBe(true);
  await context.setOffline(true);
  const external: string[] = [];
  page.on("request", request => {
    if (/tile\.openstreetmap|nominatim|router\.project/.test(request.url()))
      external.push(request.url());
  });
  await page.reload();
  await expect(page.getByText(/Ruas locais disponíveis/)).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Mapa offline vetorial/ })
  ).toBeVisible();
  const map = page.getByRole("region", { name: "Explorar mapa offline" });
  const marker = page.getByRole("button", {
    name: "Selecionar UPA",
    exact: true,
  });
  const initial = await marker.getAttribute("style");
  await map.focus();
  await map.press("ArrowRight");
  await expect(marker).not.toHaveAttribute("style", initial!);
  await map.press("Home");
  await expect(marker).toHaveAttribute("style", initial!);
  const themeToggle = page.getByRole("button", { name: /Usar mapa (claro|escuro)/ });
  const initialThemePressed = await themeToggle.getAttribute("aria-pressed");
  await themeToggle.click();
  const toggledTheme = page.getByRole("button", { name: /Usar mapa (claro|escuro)/ });
  await expect(toggledTheme).not.toHaveAttribute("aria-pressed", initialThemePressed ?? "");
  await page.getByRole("button", { name: "Ampliar mapa", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reduzir mapa", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reduzir mapa", exact: true }).click();
  const picker = page.getByRole("button", {
    name: "Escolher destino no mapa offline",
  });
  await picker.click();
  await page.getByRole("combobox", { name: "Pesquisar lugares no mapa" }).fill("HEAL");
  await page.getByRole("listbox", { name: "Resultados de lugares" }).getByRole("option", { name: /^HEAL ·/ }).click();
  await expect(page.getByText("HEAL", { exact: true }).last()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
  expect(external).toEqual([]);
});

test("Pages: calculate a new local trip after offline reload and resume online", async ({ page, context }) => {
  await page.goto("mapa");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.goto("planejar?origem=Prefeitura&destino=HEAL&experiencia=offline");
  await page.getByRole("button", { name: "Calcular rota", exact: true }).click();
  await expect(page.getByText(/Rota preparada localmente sem usar provedores externos/)).toBeVisible();
  await expect(page.getByRole("img", { name: "Prévia offline da rota" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar acompanhamento", exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Calcular rota", exact: true }).click();
  await expect(page.getByRole("img", { name: "Prévia offline da rota" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("online", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar acompanhamento", exact: true })).toBeVisible();
});

test("Pages: selects both endpoints and calculates every travel mode from the offline catalog", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("mapa");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.goto("planejar?experiencia=offline");
  await page.getByRole("button", { name: "Escolher origem no catálogo local", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar origem local", exact: true }).fill("Avenida Brasília");
  await page.getByRole("list", { name: "Pontos locais para origem", exact: true }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Escolher destino no catálogo local", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar destino local", exact: true }).fill("HEAL");
  await page.getByRole("list", { name: "Pontos locais para destino", exact: true }).getByRole("button").first().click();
  for (const mode of ["Carro", "A pé", "Bicicleta", "Transporte"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.getByRole("button", { name: "Calcular rota", exact: true }).click();
    await expect(page.getByRole("img", { name: "Prévia offline da rota", exact: true })).toBeVisible();
    await expect(page.getByText("Estimativa local", { exact: true }).first()).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("Pages: imported companies reload offline and plan all modes from their actual catalog coordinates", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("mapa");
  await expect(page.getByText(/21\.486 empresas do arquivo/)).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/21\.486 empresas do arquivo/)).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar destino no mapa" }).fill("42.115.689/0001-40");
  const card = page.getByRole("article").filter({ has: page.getByText("AMAG", { exact: true }) });
  await expect(card).toHaveCount(1);
  await expect(card.getByText(/Referência aproximada: Quadra/)).toBeVisible();
  await card.getByRole("link", { name: "Ir até aqui", exact: true }).click();
  await page.getByRole("button", { name: "Escolher origem no catálogo local", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar origem local", exact: true }).fill("HEAL");
  await page.getByRole("list", { name: "Pontos locais para origem", exact: true }).getByRole("button").first().click();
  for (const mode of ["Carro", "A pé", "Bicicleta", "Transporte"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.getByRole("button", { name: "Calcular rota", exact: true }).click();
    await expect(page.getByRole("img", { name: "Prévia offline da rota", exact: true })).toBeVisible();
    await expect(page.getByText("Estimativa local", { exact: true }).first()).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await context.setOffline(false);
  await expect(page.getByText("online", { exact: true }).first()).toBeVisible();
});
