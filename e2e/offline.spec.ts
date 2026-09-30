import { expect, test } from "@playwright/test";

test("postos: continua navegável depois de perder a conexão", async ({ page, context }) => {
  await page.goto("/postos?q=postos", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();

  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) throw new Error("Service Worker não suportado neste navegador de teste.");

    const timeout = new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error("Service Worker não ficou pronto em 10s.")), 10_000),
    );

    const registration = await Promise.race([
      navigator.serviceWorker.getRegistration().then(current =>
        current ?? navigator.serviceWorker.register(new URL("./sw.js", window.location.href), { scope: new URL("./", window.location.href).href }),
      ),
      timeout,
    ]);

    await Promise.race([registration.update(), new Promise(resolve => window.setTimeout(resolve, 3_000))]);
    await Promise.race([navigator.serviceWorker.ready, timeout]);

    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
        window.setTimeout(resolve, 3_000);
      });
    }
  });

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  await expect(page.getByText(/Diretório completo/i)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /filtrar diretório de postos/i })).toBeVisible();
});
