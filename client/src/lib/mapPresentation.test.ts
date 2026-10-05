import { expect, it } from "vitest";
import { groundMetresPerPixel, roadPriority } from "./mapPresentation";
it("keeps major roads and their links above local streets", () => {
  expect(roadPriority("motorway_link")).toBe(roadPriority("motorway"));
  expect(roadPriority("primary")).toBeGreaterThan(roadPriority("residential"));
  expect(roadPriority("residential")).toBeGreaterThan(0);
});
it("uses the displayed latitude and zoom for the ground scale", () => {
  const equator = groundMetresPerPixel(0.5, 1000);
  const latitude60 = (1 - Math.log(Math.tan(Math.PI / 3) + 1 / Math.cos(Math.PI / 3)) / Math.PI) / 2;
  expect(groundMetresPerPixel(latitude60, 1000)).toBeCloseTo(equator / 2);
  expect(groundMetresPerPixel(0.5, 2000)).toBeCloseTo(equator / 2);
});
