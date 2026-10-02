import { expect, test } from "@playwright/test";
test("Pages: city streets and controls survive an offline reload without external map requests", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("mapa");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    )
    .toBe(true);
  await context.setOffline(true);
  await expect(
    page.getByRole("img", { name: /Mapa offline vetorial/ })
  ).toBeVisible();
  const external: string[] = [];
  page.on("request", request => {
    if (/tile\.openstreetmap|nominatim|router\.project/.test(request.url()))
      external.push(request.url());
  });
  await page.reload();
  await expect(page.getByText(/Ruas locais disponíveis/)).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Mapa offline vetorial/ })
  ).toBeVisible();
  const map = page.getByRole("region", { name: "Explorar mapa offline" });
  const marker = page.getByRole("button", {
    name: "Selecionar UPA",
    exact: true,
  });
  const initial = await marker.getAttribute("style");
  await map.focus();
  await map.press("ArrowRight");
  await expect(marker).not.toHaveAttribute("style", initial!);
  await map.press("Home");
  await expect(marker).toHaveAttribute("style", initial!);
  await page.getByRole("button", { name: "Usar mapa escuro" }).click();
  await expect(
    page.getByRole("button", { name: "Usar mapa claro" })
  ).toHaveAttribute("aria-pressed", "true");
  const picker = page.getByRole("combobox", {
    name: "Escolher destino no mapa offline",
  });
  await picker.selectOption({ label: "HEAL" });
  await expect(page.getByText("HEAL", { exact: true }).last()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(320);
  expect(external).toEqual([]);
});
