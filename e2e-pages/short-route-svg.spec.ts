import { expect, test } from "@playwright/test";

for (const width of [320, 1360]) {
  test(`Pages: short street route stays drawn at its pins through zoom at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 640 : 900 });
    await page.goto("planejar?origem=-15.731%2C-48.276&destino=-15.733%2C-48.274&experiencia=offline");
    await page.getByRole("button", { name: "A pé", exact: true }).click();
    await page.getByTestId("planner-primary-action").click();
    await expect(page.getByText("Rota viária offline", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Abrir mapa em tela cheia", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Mapa da viagem em tela cheia" });
    const route = dialog.locator("[data-offline-route-geometry]");
    async function checkPinAlignment() {
      await expect.poll(() => route.evaluate(path => {
        const line = path as SVGPathElement;
        const matrix = line.getScreenCTM();
        if (!matrix) return Infinity;
        const ends = [line.getPointAtLength(0), line.getPointAtLength(line.getTotalLength())];
        return Math.max(...["Origem", "Destino"].map((name, index) => {
          const pin = document.querySelector(`[role="dialog"] button[aria-label="Selecionar ${name}"]`);
          if (!pin) return Infinity;
          const box = pin.getBoundingClientRect();
          const point = ends[index].matrixTransform(matrix);
          return Math.hypot(point.x - (box.left + box.width / 2), point.y - box.bottom);
        }));
      })).toBeLessThan(8);
    }
    await checkPinAlignment();
    for (let step = 0; step < 10; step++) {
      await dialog.getByRole("button", { name: "Aumentar zoom da prévia", exact: true }).click();
    }
    await checkPinAlignment();
  });
}
