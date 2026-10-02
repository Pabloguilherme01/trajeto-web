import { expect, test } from "@playwright/test";

test("Pages: clearing data resets the visible home and discards a pending GPS result", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("trajeto-recent-searches", JSON.stringify(["Rua particular de teste"]));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (success: PositionCallback) => {
        window.addEventListener("test-gps-result", () => success({
          coords: { latitude: -15.76123, longitude: -48.28123 },
        } as GeolocationPosition), { once: true });
      },
    } });
  });
  await page.goto("", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("De onde você sai").fill("Casa de teste");
  await page.getByPlaceholder("Para onde você vai").fill("Hospital");
  await page.getByRole("button", { name: "Usar minha localização como origem" }).click();
  await page.getByRole("button", { name: "Abrir acessibilidade" }).click();
  await page.getByRole("button", { name: "Limpar dados do Trajeto neste aparelho" }).click();
  await page.getByRole("button", { name: "Confirmar limpeza" }).click();
  await expect(page.getByText("Dados locais removidos. O Trajeto voltou ao estado inicial neste aparelho.")).toBeVisible();
  await page.getByRole("button", { name: "Fechar acessibilidade" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("test-gps-result")));
  await expect(page.getByPlaceholder("De onde você sai")).toHaveValue("");
  await expect(page.getByPlaceholder("Para onde você vai")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Buscar novamente: Rua particular de teste" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Usar minha localização como origem" })).toBeEnabled();
});

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
