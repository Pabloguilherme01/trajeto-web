import { expect, test } from "@playwright/test";

test("Pages: clearing Trajeto device data also removes offline routes and session caches", async ({ page }) => {
  await page.goto("salvos", { waitUntil: "domcontentloaded" });

  await page.evaluate(async () => {
    localStorage.setItem("trajeto-mobile-destinations", "[]");
    localStorage.setItem("other-app-setting", "keep");
    sessionStorage.setItem("trajeto:public-routing:route:test", "cached");
    sessionStorage.setItem("other-session-setting", "keep");

    const request = indexedDB.open("trajeto-offline", 2);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("routes")) {
          request.result.createObjectStore("routes", { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("routes", "readwrite");
      tx.objectStore("routes").put({
        id: "casa::hospital",
        origin: "Casa",
        destination: "Hospital",
        savedAt: new Date().toISOString(),
        payload: {
          route: {
            distanceLabel: "5 km",
            distanceMeters: 5000,
            durationSeconds: 600,
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

  await page.getByRole("button", { name: "Abrir acessibilidade" }).click();
  const clear = page.getByRole("button", {
    name: "Limpar dados do Trajeto neste aparelho",
  });
  await expect(clear).toBeVisible();
  await clear.click();
  await page.getByRole("button", { name: "Confirmar limpeza" }).click();

  await expect(
    page.getByText("Dados locais removidos. O Trajeto voltou ao estado inicial neste aparelho.")
  ).toBeVisible();

  const remaining = await page.evaluate(async () => {
    const request = indexedDB.open("trajeto-offline", 2);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const routeKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const read = db.transaction("routes").objectStore("routes").getAllKeys();
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
    });
    db.close();

    return {
      routeKeys,
      localTrajetoKeys: Object.keys(localStorage).filter(
        key => key.startsWith("trajeto-") || key.startsWith("trajeto:")
      ),
      sessionTrajetoKeys: Object.keys(sessionStorage).filter(
        key => key.startsWith("trajeto-") || key.startsWith("trajeto:")
      ),
      otherLocal: localStorage.getItem("other-app-setting"),
      otherSession: sessionStorage.getItem("other-session-setting"),
    };
  });

  expect(remaining.routeKeys).toEqual([]);
  expect(remaining.localTrajetoKeys).toEqual([]);
  expect(remaining.sessionTrajetoKeys).toEqual([]);
  expect(remaining.otherLocal).toBe("keep");
  expect(remaining.otherSession).toBe("keep");
});
