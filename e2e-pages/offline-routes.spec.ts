import { expect, test, type Page } from "@playwright/test";

async function planRoute(page: Page) {
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
  await page.goto(
    "planejar?origem=-15.7545,-48.2816&destino=-15.7942,-47.8822",
    { waitUntil: "domcontentloaded" }
  );
  await page
    .getByRole("button", { name: "Ir até aqui", exact: true })
    .click();
  await expect(page.locator("[data-route-card]").getByText("12,3 km", { exact: true })).toBeVisible();
}

test("Pages: saved routes commit, prune to 50 and reopen offline", async ({
  page,
  context,
}) => {
  await page.goto("salvos", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const request = indexedDB.open("trajeto-offline", 2);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("routes"))
          request.result.createObjectStore("routes", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("routes", "readwrite");
      for (let index = 0; index < 50; index++)
        tx.objectStore("routes").put({
          id: "seed-" + index,
          origin: "Origem " + index,
          destination: "Destino " + index,
          savedAt: new Date(946684800000 + index * 1000).toISOString(),
          payload: {
            route: {
              distanceLabel: "1 km",
              distanceMeters: 1000,
              durationSeconds: 60,
            },
            stops: [],
            anpReferences: [],
          },
        });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await planRoute(page);
  await page
    .getByRole("button", { name: "Preparar para offline", exact: true })
    .click();
  await expect(
    page.getByText("Viagem preparada para uso offline neste aparelho.")
  ).toBeVisible();
  const ids = await page.evaluate(async () => {
    const open = indexedDB.open("trajeto-offline", 2);
    const db = await new Promise<IDBDatabase>(resolve => {
      open.onsuccess = () => resolve(open.result);
    });
    const keys = await new Promise<IDBValidKey[]>(resolve => {
      const read = db.transaction("routes").objectStore("routes").getAllKeys();
      read.onsuccess = () => resolve(read.result);
    });
    db.close();
    return keys;
  });
  expect(ids).toHaveLength(50);
  expect(ids.some(id => String(id).startsWith("seed-"))).toBe(false);
  expect(ids).not.toContain("origem 0::destino 0::driving");
  expect(ids).toContain("origem 1::destino 1::driving");
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
  await page
    .getByRole("button", { name: "Ir até aqui", exact: true })
    .click();
  await expect(page.locator("[data-route-card]").getByText("12,3 km", { exact: true })).toBeVisible();
});

test("Pages: an aborted IndexedDB transaction never announces a saved route", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      const request =
        key === undefined
          ? original.call(this, value)
          : original.call(this, value, key);
      if (this.transaction.db.name === "trajeto-offline") {
        const transaction = this.transaction;
        request.addEventListener("success", () => transaction.abort(), {
          once: true,
        });
      }
      return request;
    };
  });
  await planRoute(page);
  await page
    .getByRole("button", { name: "Preparar para offline", exact: true })
    .click();
  await expect(
    page.getByText("Não foi possível preparar esta viagem para uso offline.")
  ).toBeVisible();
  await expect(
    page.getByText("Viagem preparada para uso offline neste aparelho.")
  ).toHaveCount(0);
});


test("Pages: legacy migration keeps the newest safe route for the same destination", async ({ page }) => {
  await page.goto("salvos", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const request = indexedDB.open("trajeto-offline", 2);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("routes"))
          request.result.createObjectStore("routes", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const payload = (distanceMeters: number) => ({
      route: { distanceLabel: distanceMeters / 1000 + " km", distanceMeters, durationSeconds: 60 },
      stops: [],
      anpReferences: [],
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("routes", "readwrite");
      const store = tx.objectStore("routes");
      store.put({
        id: "-15.76123, -48.28123::hospital",
        origin: "-15.76123, -48.28123",
        destination: "Hospital",
        savedAt: "2026-09-01T10:00:00.000Z",
        payload: payload(1000),
      });
      store.put({
        id: "minha localização::hospital",
        origin: "Minha localização",
        destination: "Hospital",
        savedAt: "2026-10-01T10:00:00.000Z",
        payload: payload(2000),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  await page.goto(
    "planejar?rota=" + encodeURIComponent("-15.76123, -48.28123::hospital"),
    { waitUntil: "domcontentloaded" },
  );

  await expect(page).toHaveURL(/rota=minha(?:%20|\+)localiza%C3%A7%C3%A3o%3A%3Ahospital%3A%3Adriving/i);
  const saved = await page.evaluate(async () => {
    const request = indexedDB.open("trajeto-offline", 2);
    const db = await new Promise<IDBDatabase>(resolve => {
      request.onsuccess = () => resolve(request.result);
    });
    const rows = await new Promise<any[]>(resolve => {
      const read = db.transaction("routes").objectStore("routes").getAll();
      read.onsuccess = () => resolve(read.result);
    });
    db.close();
    return rows;
  });

  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe("minha localização::hospital::driving");
  expect(saved[0].savedAt).toBe("2026-10-01T10:00:00.000Z");
  expect(saved[0].payload.route.distanceMeters).toBe(2000);
});

test("Pages: recovers an exact saved trip when online geocoding fails", async ({ page }) => {
  await page.goto("salvos");
  await page.evaluate(async () => {
    const open = indexedDB.open("trajeto-offline", 2);
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains("routes")) open.result.createObjectStore("routes", { keyPath: "id" }); };
    const db = await new Promise<IDBDatabase>((resolve, reject) => { open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("routes", "readwrite");
      tx.objectStore("routes").put({ id: "saved-provider-failure", origin: "Origem apenas salva", destination: "Destino apenas salvo", savedAt: new Date().toISOString(), payload: {
        route: { origin: { lat: -15.7545, lng: -48.2816 }, destination: { lat: -15.7645, lng: -48.2716 }, distanceLabel: "12 km", distanceMeters: 12000, durationSeconds: 900, polyline: "r`d_B~~teHbwFg_mA", mode: "driving", source: "osrm" },
        stops: [], anpReferences: [], recommendation: null,
      } });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.route("https://nominatim.openstreetmap.org/**", route => route.abort());
  await page.goto("planejar?origem=Origem%20apenas%20salva&destino=Destino%20apenas%20salvo");
  await page.getByRole("button", { name: "Ir até aqui", exact: true }).click();
  await expect(page.getByText(/Usando a melhor rota já salva/)).toBeVisible();
  await expect(page.getByText(/trânsito e horários podem estar desatualizados/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar acompanhamento", exact: true })).toBeVisible();
});

test("Pages: prepared endpoints support new offline trips in every mode and coordinate-based route recovery", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("planejar?experiencia=offline", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const open = indexedDB.open("trajeto-offline", 2);
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains("routes")) open.result.createObjectStore("routes", { keyPath: "id" }); };
    const db = await new Promise<IDBDatabase>((resolve, reject) => { open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("routes", "readwrite");
      const a = { lat: -15.75123, lng: -48.27123 }, b = { lat: -15.76123, lng: -48.28123 }, c = { lat: -15.77123, lng: -48.29123 };
      for (const [origin, destination, from, to] of [["Ponto preparado A", "Ponto preparado B", a, b], ["Ponto preparado B", "Ponto preparado C", b, c]] as const) {
        tx.objectStore("routes").put({ id: origin + destination, origin, destination, savedAt: new Date().toISOString(), payload: {
          route: { origin: from, destination: to, distanceLabel: "12 km", distanceMeters: 12000, durationSeconds: 900, polyline: "r`d_B~~teHbwFg_mA", mode: "driving", source: "osrm", steps: [{ instruction: "Siga pela via preparada", distanceMeters: 12000, durationSeconds: 900 }] }, stops: [], anpReferences: [], recommendation: null,
        } });
      }
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
    for (const storage of [localStorage, sessionStorage]) {
      Object.keys(storage).filter(key => key.startsWith("trajeto:public-routing:")).forEach(key => storage.removeItem(key));
    }
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBeTruthy();
  let external = 0;
  page.on("request", request => { if (/nominatim|project-osrm|api.mapbox/.test(request.url())) external++; });
  await context.setOffline(true);
  await page.reload();
  await page.getByPlaceholder("De onde você sai", { exact: true }).fill("Ponto preparado A");
  await page.getByPlaceholder("Para onde você vai", { exact: true }).fill("Ponto preparado C");
  for (const mode of ["Carro", "A pé", "Bicicleta", "Transporte"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.getByRole("button", { name: "Ir até aqui", exact: true }).click();
    await expect(page.getByRole("img", { name: "Prévia offline da rota", exact: true })).toBeVisible();
    await expect(page.getByText(/Trajeto calculado na malha salva|Estimativa em linha reta/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
  await page.getByRole("button", { name: "Ocultar referências", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mostrar referências", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Carro", exact: true }).click();
  await page.getByPlaceholder("De onde você sai", { exact: true }).fill("-15.75123,-48.27123");
  await page.getByPlaceholder("Para onde você vai", { exact: true }).fill("Ponto preparado B");
  await page.getByRole("button", { name: "Ir até aqui", exact: true }).click();
  await expect(page.getByText(/Usando a melhor rota já salva/)).toBeVisible();
  await page.getByRole("button", { name: /Instruções pelas ruas/ }).click();
  await expect(page.getByText("Siga pela via preparada")).toBeVisible();
  expect(external).toBe(0);
});
