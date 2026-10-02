import { expect, test } from "@playwright/test";
test("city map: filters destinations and opens planner with ride options at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("mapa", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "A cidade no seu caminho" })
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar destino no mapa" })
    .fill("odisseia");
  await page.getByRole("button", { name: /UPA.*Planejar viagem/ }).click();
  await expect(page.getByPlaceholder("Para onde você vai")).toHaveValue(
    /UPA Mansões Odisseia/
  );
  await expect(page.getByRole("link", { name: "Abrir Uber" })).toHaveAttribute(
    "href",
    /m\.uber\.com/
  );
  await expect(page.getByRole("link", { name: "Abrir 99" })).toHaveAttribute(
    "href",
    "https://99app.com/"
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
});
test("planner: draws provider geometry over public street tiles", async ({
  page,
}) => {
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
  await page.route("https://tile.openstreetmap.org/**", route =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e2e9e4"/></svg>',
    })
  );
  await page.goto(
    "planejar?origem=-15.7545,-48.2816&destino=-15.7942,-47.8822"
  );
  await page
    .getByRole("button", { name: "Calcular rota", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Trajeto pelas ruas" })
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Escolher ponto da viagem" })
  ).toBeVisible();
});
