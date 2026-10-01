import { expect, test } from "@playwright/test";

test("postos: continua navegável depois de perder a conexão", async ({ page, context }) => {
  await page.goto("/postos?q=postos", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Encontre um posto por perto/i })).toBeVisible();

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

  await expect(page.getByRole("heading", { name: /Encontre um posto por perto/i })).toBeVisible();
  await expect(page.getByText(/Diretório completo/i)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /filtrar diretório de postos/i })).toBeVisible();
});


test("ajuda offline mostra o que está salvo e continua acessível sem rede", async ({ page, context }) => {
  await page.goto("/ajuda#offline-readiness-title", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: /Essencial pronto neste aparelho|Prepare antes de sair/i })
  ).toBeVisible();
  const readiness = page.locator('section[aria-labelledby="offline-readiness-title"]');
  await expect(readiness.getByText("Rotas salvas", { exact: true })).toBeVisible();
  await expect(readiness.getByText("Serviços salvos", { exact: true })).toBeVisible();
  await expect(readiness.getByText("Postos salvos", { exact: true })).toBeVisible();
  await expect(readiness.getByText("Pontos do mapa salvos", { exact: true })).toBeVisible();

  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: /Essencial pronto neste aparelho|Prepare antes de sair/i })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Usar busca offline|Escolher o que salvar/i })).toBeVisible();
});
