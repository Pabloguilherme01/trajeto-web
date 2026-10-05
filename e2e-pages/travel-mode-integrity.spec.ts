import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("explicit offline mode keeps saved road geometry and navigation on device", async ({ page }) => {
  await page.goto("planejar");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("trajeto-offline", 2);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("routes")) request.result.createObjectStore("routes", { keyPath: "id" }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("routes", "readwrite");
        tx.objectStore("routes").put({ id: "road", origin: "Prefeitura", destination: "Hospital", savedAt: new Date().toISOString(), payload: { route: { origin: { lat: -15.7545, lng: -48.2816 }, destination: { lat: -15.7942, lng: -47.8822 }, distanceLabel: "12 km", distanceMeters: 12000, durationSeconds: 900, source: "osrm", mode: "driving", polyline: "r`d_B~~teHbwFg_mA" }, stops: [], anpReferences: [] } });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
  const external: string[] = [];
  page.on("request", request => { if (/tile\.openstreetmap|router\.project-osrm|api\.mapbox|maps\.googleapis|nominatim/.test(request.url())) external.push(request.url()); });
  await page.goto("planejar?experiencia=offline&origem=Prefeitura&destino=Hospital");
  await page.locator("summary").filter({ hasText: "Mais recursos da viagem" }).click();
  await expect(page.getByText("Pronta · recente", { exact: true })).toBeVisible();
  await page.getByTestId("planner-primary-action").click();
  await expect(page.getByRole("region", { name: "Mapa offline da viagem" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir no Google Maps" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Google Maps", exact: true })).toHaveCount(0);
  expect(external).toEqual([]);
});

for (const mode of ["A pé", "Bicicleta", "Transporte"]) {
  test(`${mode} does not request or display an OSRM car route`, async ({ page }) => {
    const providerRequests: string[] = [];
    await page.route("https://router.project-osrm.org/**", async route => {
      providerRequests.push(route.request().url());
      await route.fulfill({ json: { code: "Ok", routes: [{ distance: 4000, duration: 120, geometry: "car-route" }] } });
    });
    await page.goto("planejar");
    await page.getByPlaceholder("De onde você sai").fill("Prefeitura de Águas Lindas de Goiás");
    await page.getByPlaceholder("Para onde você vai").fill("UPA Mansões Odisseia");
    if (!await page.getByRole("button", { name: mode, exact: true }).isVisible()) await page.locator("summary").filter({ hasText: "Alterar viagem" }).click();
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.getByTestId("planner-primary-action").click();
    await expect(page.getByText("Estimativa local", { exact: true }).first()).toBeVisible();
    if (mode === "Transporte") await expect(page.getByText(/sem linhas, horários, espera ou conexões confirmados/)).toBeVisible();
    expect(providerRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
