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
        const routeBox = line.getBoundingClientRect();
        return Math.max(...["Origem", "Destino"].map((name, index) => {
          const pin = document.querySelector(`[role="dialog"] button[aria-label="Selecionar ${name}"]`);
          if (!pin) return Infinity;
          const box = pin.getBoundingClientRect();
          const point = ends[index].matrixTransform(matrix);
          const x = box.left + box.width / 2, y = box.bottom;
          return Math.max(Math.hypot(point.x - x, point.y - y),
            routeBox.left - x, x - routeBox.right, routeBox.top - y, y - routeBox.bottom);
        }));
      })).toBeLessThan(8);
      await expect.poll(() => dialog.locator("[data-offline-road-layer]").evaluateAll(layers => {
        const map = document.querySelector('[role="dialog"] [aria-label="Explorar mapa offline"]')?.getBoundingClientRect();
        if (!map) return false;
        return layers.some(layer => {
          const road = layer.getBoundingClientRect();
          return road.width > 0 && road.height > 0 && road.right >= map.left &&
            road.left <= map.right && road.bottom >= map.top && road.top <= map.bottom;
        });
      })).toBe(true);
    }
    await checkPinAlignment();
    for (let step = 0; step < 10; step++) {
      await dialog.getByRole("button", { name: "Aumentar zoom da prévia", exact: true }).click();
    }
    await checkPinAlignment();
  });
}
