import { expect, it } from "vitest";
import { groundMetresPerPixel, roadPriority, viewportTileBounds } from "./mapPresentation";
it("keeps major roads and their links above local streets", () => {
  expect(roadPriority("motorway_link")).toBe(roadPriority("motorway"));
  expect(roadPriority("primary")).toBeGreaterThan(roadPriority("residential"));
  expect(roadPriority("residential")).toBeGreaterThan(0);
});
it("covers mobile viewports at fractional zoom with fewer tiles and no edge gaps", () => {
  for (const scale of [1, 1.1, 1.5, 1.99]) for (const offset of [0, 127, 255]) {
    const center = { x: 4096 + offset, y: 4096 + offset };
    const bounds = viewportTileBounds(center, 320, 520, scale);
    expect(bounds.minX * 256).toBeLessThanOrEqual(center.x - 160 / scale - 256);
    expect((bounds.maxX + 1) * 256).toBeGreaterThanOrEqual(center.x + 160 / scale + 256);
    expect(bounds.minY * 256).toBeLessThanOrEqual(center.y - 260 / scale - 256);
    expect((bounds.maxY + 1) * 256).toBeGreaterThanOrEqual(center.y + 260 / scale + 256);
    expect((bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1)).toBeLessThanOrEqual(30);
  }
});
it("uses the displayed latitude and zoom for the ground scale", () => {
  const equator = groundMetresPerPixel(0.5, 1000);
  const latitude60 = (1 - Math.log(Math.tan(Math.PI / 3) + 1 / Math.cos(Math.PI / 3)) / Math.PI) / 2;
  expect(groundMetresPerPixel(latitude60, 1000)).toBeCloseTo(equator / 2);
  expect(groundMetresPerPixel(0.5, 2000)).toBeCloseTo(equator / 2);
});
