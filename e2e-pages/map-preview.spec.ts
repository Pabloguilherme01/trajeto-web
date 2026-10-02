import { expect, test } from "@playwright/test";

test("Pages: route preview controls and real geometry remain available offline at 320px", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
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
  await expect(page.getByRole("button", { name: "Ocultar mapa", exact: true })).toBeVisible();
  const map = page.getByRole("region", { name: "Mapa independente da viagem" });
  await expect(
    map.getByRole("img", { name: "Prévia offline da rota" })
  ).toBeVisible();
  await expect(
    map.getByText(/Geometria disponível neste aparelho/)
  ).toBeVisible();
  const navigationHref = await map
    .getByRole("link", { name: "Abrir no Google Maps" })
    .getAttribute("href");
  expect(navigationHref).toContain(
    "origin=-15.754,-48.282&destination=-15.7942,-47.8822"
  );
  expect(navigationHref).not.toContain("-15.7545");
  expect(navigationHref).not.toContain("-48.2816");
  await map.getByRole("button", { name: "Aumentar zoom da prévia" }).click();
  await expect(
    map.getByRole("button", { name: "Diminuir zoom da prévia" })
  ).toBeEnabled();
  await map.getByRole("button", { name: "Enquadrar", exact: true }).click();
  await expect(
    map.getByRole("button", { name: "Diminuir zoom da prévia" })
  ).toBeDisabled();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
  await page
    .getByRole("button", { name: "Salvar offline", exact: true })
    .click();
  await expect(
    page.getByText("Cópia offline atualizada neste aparelho.")
  ).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Ocultar mapa", exact: true })).toBeVisible();
  await expect(
    map.getByText(/Geometria disponível neste aparelho/)
  ).toBeVisible();
  await map.getByRole("button", { name: "Aumentar zoom da prévia" }).click();
  await expect(
    map.getByRole("button", { name: "Diminuir zoom da prévia" })
  ).toBeEnabled();
});
