import { expect, test } from "@playwright/test";
test("city map: filters destinations and opens planner with ride options at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("mapa", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "A cidade no seu caminho" })
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar destino no mapa" })
    .fill("odisseia");
  await page.locator("article").filter({ hasText: "UPA" }).getByRole("link", { name: "Ir até aqui", exact: true }).click();
  await expect(page.getByPlaceholder("Para onde você vai")).toHaveValue(
    /UPA Mansões Odisseia/
  );
  await expect(page.getByRole("link", { name: "Abrir Uber" })).toHaveAttribute(
    "href",
    /m\.uber\.com/
  );
  await expect(page.getByRole("link", { name: "Abrir 99" })).toHaveAttribute(
    "href",
    "https://99app.com/"
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
});
test("planner: draws provider geometry over public street tiles", async ({
  page,
}) => {
  await page.route("https://router.project-osrm.org/**", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: "Ok",
        routes: [
          { distance: 12340, duration: 920, geometry: "r`d_B~~teHbwFg_mA" },
        ],
      }),
    })
  );
  await page.route("https://tile.openstreetmap.org/**", route =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e2e9e4"/></svg>',
    })
  );
  await page.goto(
    "planejar?origem=-15.7545,-48.2816&destino=-15.7942,-47.8822"
  );
  await page
    .getByRole("button", { name: "Calcular rota", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Trajeto pelas ruas" })
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Escolher ponto da viagem" })
  ).toBeVisible();
});


test("street atlas: filters references and calculates a bundled destination offline", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("mapa");
  await page.getByRole("button", { name: "Ruas e avenidas", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar destino no mapa" }).fill("Avenida Brasília");
  const card = page.locator("article").filter({ has: page.getByText("Avenida Brasília", { exact: true }) });
  await expect(card.getByText(/Centro aproximado da via/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Limpar busca do mapa" }).click();
  await expect(page.getByRole("textbox", { name: "Buscar destino no mapa" })).toHaveValue("");
  await page.goto("planejar?origem=-15.7545,-48.2816&destino=" + encodeURIComponent("Avenida Brasília, Águas Lindas de Goiás - GO"));
  await expect(page.getByRole("button", { name: "Calcular rota", exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Calcular rota", exact: true }).click();
  await expect(page.getByText(/Estimativa local/).first()).toBeVisible();
});

test("live trip: updates the local map without storing GPS and stops explicitly", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { liveGps?: PositionCallback; lastGps?: PositionCallback; stopped?: number };
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      watchPosition: (success: PositionCallback) => { state.liveGps = success; state.lastGps = success; return 44; },
      clearWatch: (id: number) => { state.stopped = id; state.liveGps = undefined; },
    } });
  });
  await page.route("https://router.project-osrm.org/**", route => route.abort());
  await page.goto("planejar?origem=-15.7545,-48.2816&destino=-15.7345,-48.2816");
  await page.getByRole("button", { name: "Calcular rota", exact: true }).click();
  await expect(page.getByRole("button", { name: "Iniciar acompanhamento", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar acompanhamento", exact: true }).click();
  await page.evaluate(() => {
    (window as unknown as { liveGps: PositionCallback }).liveGps({ coords: { latitude: -15.7431234, longitude: -48.2816, accuracy: 20 }, timestamp: Date.now() } as GeolocationPosition);
  });
  await expect(page.getByText("Distância restante", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Selecionar Você agora", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, url: location.href }))).not.toContain("-15.7431234");
  await page.getByRole("button", { name: "Parar acompanhamento", exact: true }).click();
  await expect(page.getByRole("button", { name: "Selecionar Você agora", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { stopped: number }).stopped)).toBe(44);
});
