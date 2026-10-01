import { expect, test } from "@playwright/test";

test("favorito: planejar preenche o novo destino sem carregar a viagem anterior", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("trajeto-mobile-station-favorites", JSON.stringify([{ placeId: "saved-station", name: "Posto salvo", address: "Rua de teste, Águas Lindas", lat: -15.76, lng: -48.28, openingHours: [], isOpen: true }]));
  });
  await page.goto("/salvos", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Aberto na consulta salva")).toBeVisible();
  await page.locator("article").filter({ hasText: "Posto salvo" }).getByRole("button", { name: "Planejar", exact: true }).click();
  await expect(page.getByPlaceholder("Digite o destino")).toHaveValue("Rua de teste, Águas Lindas");
  await expect(page.getByPlaceholder("Seu ponto de partida")).toHaveValue("");
});

test("mobile: Mais abre ajuda e pode ser fechado pelo teclado", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Menu da navegação móvel");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const more = page.getByRole("button", { name: "Mais opções" });
  await more.click();
  await expect(page.getByRole("dialog", { name: "Mais opções" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(more).toBeFocused();
  await more.click();
  await page.getByRole("button", { name: "Preparar offline" }).click();
  await expect(page).toHaveURL(/\/ajuda#offline-readiness-title$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});


test("planejar: calcula rota pública sem backend e mantém o mapa utilizável", async ({ page }) => {
  await page.route("https://router.project-osrm.org/**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      code: "Ok",
      routes: [{
        distance: 12340,
        duration: 920,
        geometry: "r`d_B~~teHbwFg_mA",
      }],
    }),
  }));

  await page.goto("/planejar?origem=-15.7545,-48.2816&destino=-15.7942,-47.8822", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Calcular rota" }).click();

  const distance = page.getByText("Distância", { exact: true }).locator("..");
  const duration = page.getByText("Tempo", { exact: true }).locator("..");
  await expect(distance.getByText("12,3 km", { exact: true })).toBeVisible();
  await expect(duration.getByText("15 min", { exact: true })).toBeVisible();
  await expect(page.getByText(/Trânsito ao vivo não disponível|Estimativa local/).first()).toBeVisible();

  await expect(page.getByRole("region", { name: "Mapa de ruas da rota" })).toBeVisible();
});


test("planejar: mantém a rota utilizável quando o OSRM está indisponível", async ({ page }) => {
  await page.route("https://router.project-osrm.org/**", route => route.abort());
  await page.goto("/planejar?origem=-15.7545,-48.2816&destino=-15.7942,-47.8822", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Calcular rota" }).click();

  await expect(page.getByText(/Estimativa local/).first()).toBeVisible();
  await expect(page.getByText(/km/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Começar navegação", exact: true })).toBeVisible();
  await page.getByText("Escolher navegador", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Google", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Waze", exact: true })).toBeVisible();
});


test("planejar: aceita destino sem GPS e oferece navegação externa", async ({ page }) => {
  await page.goto("/planejar?destino=Águas%20Lindas%20de%20Goiás", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Calcular rota" }).click();

  await expect(page.getByRole("heading", { name: /Navegação pronta/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir Google Maps", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir Waze", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir Apple Maps", exact: true })).toBeVisible();
});
