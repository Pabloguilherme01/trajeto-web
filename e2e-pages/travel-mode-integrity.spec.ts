import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

for (const mode of ["A pé", "Bicicleta", "Transporte"]) {
  test(`${mode} does not request or display an OSRM car route`, async ({ page }) => {
    const providerRequests: string[] = [];
    await page.route("https://router.project-osrm.org/**", async route => {
      providerRequests.push(route.request().url());
      await route.fulfill({ json: { code: "Ok", routes: [{ distance: 4000, duration: 120, geometry: "car-route" }] } });
    });
    await page.goto("planejar");
    await page.getByPlaceholder("De onde você sai").fill("Prefeitura de Águas Lindas de Goiás");
    await page.getByPlaceholder("Para onde você vai").fill("UPA Mansões Odisseia");
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.getByRole("button", { name: "Calcular rota", exact: true }).click();
    await expect(page.getByText("Estimativa local", { exact: true }).first()).toBeVisible();
    if (mode === "Transporte") await expect(page.getByText(/sem linhas, horários, espera ou conexões confirmados/)).toBeVisible();
    expect(providerRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
