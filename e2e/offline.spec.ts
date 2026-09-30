import { expect, test } from "@playwright/test";

test("postos: continua navegável depois de perder a conexão", async ({ page, context }) => {
  await page.goto("/postos?q=postos", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();

  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.ready;
    }
  });

  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.reload({ waitUntil: "domcontentloaded" });
  if (errors.length) console.log("Offline page errors:", errors);

  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  await expect(page.getByText(/Diretório completo/i)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /filtrar diretório de postos/i })).toBeVisible();
});
