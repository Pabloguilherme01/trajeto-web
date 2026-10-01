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
  await expect(page.getByText("12,3 km")).toBeVisible();
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
    .getByRole("button", { name: "Salvar offline", exact: true })
    .click();
  await expect(
    page.getByText("Cópia offline atualizada neste aparelho.")
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
  expect(ids).not.toContain("seed-0");
  expect(ids).toContain("seed-1");
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
  await expect(page.getByText("12,3 km")).toBeVisible();
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
    .getByRole("button", { name: "Salvar offline", exact: true })
    .click();
  await expect(
    page.getByText("Não foi possível salvar a rota neste aparelho.")
  ).toBeVisible();
  await expect(
    page.getByText("Cópia offline atualizada neste aparelho.")
  ).toHaveCount(0);
});
