import { expect, test } from "@playwright/test";

test("catalog search responds on a narrow viewport with throttled CPU", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  const cpu = await page.context().newCDPSession(page);
  await cpu.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  try {
    await page.goto("./mapa");
    await expect(page.getByText(/21\.486 empresas do arquivo/)).toBeVisible({ timeout: 60_000 });
    const search = page.getByRole("textbox", { name: "Buscar destino no mapa" });
    const start = Date.now();
    await search.fill("42.115.689/0001-40");
    await expect(page.getByRole("status").filter({ hasText: /1 destino\(s\) na lista/ })).toBeVisible();
    const responseMs = Date.now() - start;
    console.log(JSON.stringify({ viewport: 320, cpuSlowdown: 4, catalogQueryResponseMs: responseMs }));
    // A responsiveness guard, not a claim about FPS on physical devices.
    expect(responseMs).toBeLessThan(2500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await expect(page.getByRole("link", { name: "Ir até aqui" }).first()).toBeVisible();
  } finally {
    await cpu.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await cpu.detach();
  }
});


test("planner modes respond without fetching a closed location catalog", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  const cpu = await page.context().newCDPSession(page);
  await cpu.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const catalogRequests: string[] = [];
  page.on("request", request => {
    if (/\/part-\d+-[^/]+\.js(?:\?|$)/.test(request.url())) catalogRequests.push(request.url());
  });
  try {
    await page.goto("./planejar?origem=Centro&destino=HEAL");
    await expect(page.getByRole("heading", { name: "Planejar rota", exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Destino", exact: true }).fill("Prefeitura");
    await page.getByPlaceholder("De onde você sai").fill("Rodoviária");
    const samples: Array<{ mode: string; responseMs: number }> = [];
    for (const mode of ["A pé", "Bicicleta", "Transporte", "Carro"]) {
      const button = page.getByRole("button", { name: mode, exact: true });
      const start = Date.now();
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      samples.push({ mode, responseMs: Date.now() - start });
      await expect(page.getByRole("textbox", { name: "Destino", exact: true })).toHaveValue("Prefeitura");
      await expect(page.getByPlaceholder("De onde você sai")).toHaveValue("Rodoviária");
    }
    await page.getByText("Preferências da viagem", { exact: true }).click();
    for (const mode of ["Offline", "Economia", "Condução", "Inteligente"]) {
      const button = page.getByRole("button", { name: mode, exact: true });
      const start = Date.now();
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      samples.push({ mode, responseMs: Date.now() - start });
      await expect(page.getByRole("textbox", { name: "Destino", exact: true })).toHaveValue("Prefeitura");
      await expect(page.getByPlaceholder("De onde você sai")).toHaveValue("Rodoviária");
    }
    console.log(JSON.stringify({ viewport: 320, cpuSlowdown: 4, modeTransitions: samples }));
    for (const sample of samples) expect(sample.responseMs).toBeLessThan(1500);
    expect(catalogRequests).toEqual([]);
    // Prove the request observer detects the chunks when the selector is opened.
    await page.getByText("Escolher destino no catálogo", { exact: true }).click();
    await page.getByRole("button", { name: "Escolher destino no catálogo local", exact: true }).click();
    await page.getByRole("textbox", { name: "Buscar destino local" }).fill("42.115.689/0001-40");
    await expect(page.getByRole("button", { name: /Selecionar AMAG/ })).toBeVisible({ timeout: 60_000 });
    expect(catalogRequests.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  } finally {
    await cpu.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await cpu.detach();
  }
});


test("keyboard intent prepares the planner without navigating until activation", async ({ page }) => {
  await page.goto("./");
  const routes = page.getByRole("button", { name: "Rotas", exact: true });
  const planner = page.waitForResponse(response => /\/Planner-[^/]+\.js(?:\?|$)/.test(response.url()));
  await routes.focus();
  expect((await planner).ok()).toBe(true);
  await expect(page).not.toHaveURL(/\/planejar/);
  await routes.press("Enter");
  await expect(page.getByRole("heading", { name: "Planejar rota", exact: true })).toBeVisible();
});

test("ready routes mount on keyboard opening and retain filters after closing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./");
  const summary = page.getByText("Rotas prontas", { exact: true });
  const panel = summary.locator("..");
  await expect(panel.locator("input, select, article")).toHaveCount(0);
  await summary.press("Enter");
  await expect(panel.getByRole("article")).toHaveCount(6);
  const search = panel.getByRole("searchbox");
  await search.fill("HEAL");
  await panel.getByRole("combobox", { name: "Como você vai?" }).selectOption("cycling");
  await summary.press("Enter");
  await expect(panel.locator("input, select, article")).toHaveCount(0);
  await summary.press("Enter");
  await expect(search).toHaveValue("HEAL");
  await expect(panel.getByRole("combobox", { name: "Como você vai?" })).toHaveValue("cycling");
  await expect(panel.getByRole("article").first()).toHaveAttribute("aria-label", /HEAL/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("planner searches do not submit a trip and selecting a destination retains its origin and mode", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./planejar?origem=Centro&destino=Prefeitura");
  const origin = page.getByPlaceholder("De onde você sai");
  const destination = page.getByPlaceholder("Para onde você vai");
  await origin.fill("Rodoviária");
  await page.getByRole("group", { name: "2. Como ir", exact: true }).getByRole("button", { name: "Bicicleta", exact: true }).click();
  const form = page.locator("form");
  const assertUnsubmitted = async () => {
    await expect(form.getByRole("button", { name: /Calculando rota/ })).toHaveCount(0);
    await expect(page.getByText("Alterar viagem", { exact: true })).toHaveCount(0);
    await expect(origin).toHaveValue("Rodoviária");
    await expect(destination).toHaveValue("Prefeitura");
  };
  await page.getByText("Escolher destino no catálogo", { exact: true }).click();
  await page.getByRole("button", { name: "Escolher destino no catálogo local", exact: true }).click();
  const localSearch = page.getByRole("textbox", { name: "Buscar destino local" });
  await localSearch.fill("HEAL");
  await localSearch.press("Enter");
  await assertUnsubmitted();
  await page.getByText("Destinos e atalhos", { exact: true }).click();
  await page.getByText(/trajetos prontos pela cidade/).click();
  const readySearch = page.getByRole("searchbox", { name: "Buscar trajeto" });
  await readySearch.fill("HEAL");
  await readySearch.press("Enter");
  await assertUnsubmitted();
  await page.getByRole("button", { name: /Destinos disponíveis/ }).click();
  const filter = page.getByRole("textbox", { name: "Filtrar todos os destinos disponíveis" });
  await filter.fill("HEAL");
  await filter.press("Enter");
  await assertUnsubmitted();
  await page.getByRole("region", { name: "Lista de destinos disponíveis" }).getByRole("button").first().click();
  await expect(origin).toHaveValue("Rodoviária");
  await expect(destination).toHaveValue(/HEAL/);
  await expect(page.getByRole("group", { name: "2. Como ir", exact: true }).getByRole("button", { name: "Bicicleta", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/origem=Centro&destino=Prefeitura$/);
  await expect(page.getByTestId("planner-primary-action")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
