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
  const card = page.locator("article").filter({ has: page.getByText("Avenida Brasília", { exact: true }) }).filter({ hasText: "-15.73723, -48.28041" });
  await expect(card.getByText(/Centro aproximado da via/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await card.getByRole("link", { name: "Ir até aqui", exact: true }).click();
  await page.getByPlaceholder("De onde você sai").fill("-15.7545,-48.2816");
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
  for (let sample = 0; sample < 3; sample++) {
    await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      (window as unknown as { liveGps: PositionCallback }).liveGps({ coords: { latitude: -15.7431234, longitude: -48.2816, accuracy: 20, speed: 3 }, timestamp: Date.now() } as GeolocationPosition);
    });
  }
  await expect(page.getByText(/chegada estimada pela velocidade atual/)).toBeVisible();

  const follow = page.getByRole("button", { name: "Seguir GPS", exact: true });
  // The first GPS fix now starts camera follow automatically.
  await expect(follow).toHaveAttribute("aria-pressed", "true");
  const gps = page.getByRole("button", { name: "Selecionar Você agora", exact: true });
  await expect.poll(() => gps.evaluate(el => Math.abs(parseFloat((el as HTMLElement).style.left) - el.parentElement!.clientWidth / 2))).toBeLessThan(1);
  await page.evaluate(() => (window as unknown as { liveGps: PositionCallback }).liveGps({ coords: { latitude: -15.7401234, longitude: -48.2816, accuracy: 20 }, timestamp: Date.now() } as GeolocationPosition));
  await expect.poll(() => gps.evaluate(el => Math.abs(parseFloat((el as HTMLElement).style.left) - el.parentElement!.clientWidth / 2))).toBeLessThan(1);
  const viewport = page.getByRole("region", { name: "Explorar mapa offline" });
  await viewport.focus();
  await viewport.press("ArrowRight");
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  const origin = page.getByRole("button", { name: "Selecionar Origem", exact: true });
  const panned = await origin.getAttribute("style");
  await page.evaluate(() => (window as unknown as { liveGps: PositionCallback }).liveGps({ coords: { latitude: -15.7391234, longitude: -48.2816, accuracy: 20 }, timestamp: Date.now() } as GeolocationPosition));
  await expect(origin).toHaveAttribute("style", panned!);
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  await follow.click();
  await expect(follow).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => gps.evaluate(el => Math.abs(parseFloat((el as HTMLElement).style.left) - el.parentElement!.clientWidth / 2))).toBeLessThan(1);
  await expect.poll(() => gps.evaluate(el => Math.abs(parseFloat((el as HTMLElement).style.top) - el.parentElement!.clientHeight / 2))).toBeLessThan(1);
  await page.getByRole("button", { name: "Ampliar mapa", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reduzir mapa", exact: true })).toHaveAttribute("aria-pressed", "true");
  const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, url: location.href }));
  for (const latitude of ["-15.7431234", "-15.7401234", "-15.7391234"]) expect(stored).not.toContain(latitude);
  await page.getByRole("button", { name: "Parar acompanhamento", exact: true }).click();
  await expect(page.getByRole("button", { name: "Selecionar Você agora", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { stopped: number }).stopped)).toBe(44);
});

test("education destinations and paginated local points remain usable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("mapa", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Educação", exact: true }).click();
  await expect(page.getByRole("button", { name: "Educação", exact: true })).toHaveAttribute("aria-pressed", "true");
  const school = page.getByRole("article").filter({ has: page.getByText("Cora Coralina", { exact: true }) });
  await expect(school).toBeVisible();
  await school.getByRole("link", { name: "Ir até aqui", exact: true }).click();
  await expect(page.getByPlaceholder("Para onde você vai")).toHaveValue(/Colégio Estadual Cora Coralina/);
  await page.getByRole("button", { name: "Escolher destino no catálogo local", exact: true }).click();
  const list = page.getByRole("list", { name: "Pontos locais para destino", exact: true });
  await expect(list.getByRole("listitem")).toHaveCount(8);
  await page.getByRole("button", { name: /Mostrar mais pontos/ }).click();
  await expect(list.getByRole("listitem")).toHaveCount(16);
  await page.getByRole("textbox", { name: "Buscar destino local", exact: true }).fill("HEAL");
  await expect(list.getByRole("button").first()).toContainText("HEAL");
  await expect(page.getByRole("button", { name: /Mostrar mais pontos/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("city map: fullscreen is usable at 320px and exits with keyboard focus restored", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("mapa", { waitUntil: "domcontentloaded" });
  const open = page.getByRole("button", { name: "Abrir mapa em tela cheia" });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Mapa da cidade em tela cheia" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Sair da tela cheia" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await open.click();
  await page.getByRole("button", { name: "Sair da tela cheia" }).click();
  await expect(dialog).toHaveCount(0);
});
