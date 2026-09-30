import { expect, test } from "@playwright/test";

test("postos: continua navegável depois de perder a conexão", async ({ page, context }) => {
  await page.goto("/postos?q=postos", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();

  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.ready;
    }
  });

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /Encontre uma parada/i })).toBeVisible();
  await expect(page.getByText(/Diretório completo/i)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /filtrar diretório de postos/i })).toBeVisible();
});
