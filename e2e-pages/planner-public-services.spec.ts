import { expect, test } from "@playwright/test";

test("Pages: destination service information and map remain useful after a real offline reload", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("planejar?origem=Prefeitura&destino=HEAL&experiencia=offline&auto=1");
  await expect(page.getByRole("region", { name: "Informações do serviço no destino" })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("img", { name: "Prévia offline da rota", exact: true })).toBeVisible();
  const service = page.getByRole("region", { name: "Informações do serviço no destino" });
  await expect(service.getByRole("link", { name: /Ligar/ })).toHaveAttribute("href", "tel:6137742660");
  await expect(service.getByRole("link", { name: /Consultar fonte/ })).toHaveCount(0);
  await expect(service.getByText(/a fonte online exige internet/)).toBeVisible();
  await page.getByRole("button", { name: "Abrir mapa em tela cheia", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Mapa da viagem em tela cheia" })).toBeVisible();
  await page.getByRole("button", { name: "Ver destino", exact: true }).click();
  await page.getByRole("button", { name: "Ver rota inteira", exact: true }).click();
  await page.getByRole("button", { name: "Sair da tela cheia", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
