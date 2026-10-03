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
    .getByRole("button", { name: "Calcular rota", exact: true })
    .click();
  await expect(page.getByText("12,3 km", { exact: true })).toBeVisible();
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
    .getByRole("button", { name: "Calcular rota", exact: true })
    .click();
  await expect(page.getByText("12,3 km", { exact: true })).toBeVisible();
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
        route: { origin: { lat: -15.7545, lng: -48.2816 }, destination: { lat: -15.7645, lng: -48.2716 }, distanceMeters: 12000, durationSeconds: 900, polyline: "r`d_B~~teHbwFg_mA", mode: "driving", source: "osrm" },
        stops: [], anpReferences: [], recommendation: null,
      } });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.route("https://nominatim.openstreetmap.org/**", route => route.abort());
  await page.goto("planejar?origem=Origem%20apenas%20salva&destino=Destino%20apenas%20salvo");
  await page.getByRole("button", { name: "Calcular rota", exact: true }).click();
  await expect(page.getByText(/Usando a melhor rota já salva/)).toBeVisible();
  await expect(page.getByText(/trânsito e horários podem estar desatualizados/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar acompanhamento", exact: true })).toBeVisible();
});
