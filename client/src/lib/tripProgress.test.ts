import { expect, it } from "vitest";
import { tripProgress } from "./tripProgress";
const path = [{ lat: 0, lng: 0 }, { lat: 0, lng: .01 }, { lat: .01, lng: .01 }];
it("measures progress along a bent route rather than a shortcut", () => {
  const p = tripProgress({ lat: 0, lng: .005 }, path, 2000, 1000)!;
  expect(p.distanceMeters).toBeCloseTo(1500, 0);
  expect(p.durationSeconds).toBeCloseTo(750, 0);
  expect(p.offRoute).toBe(false);
});
it("flags a position away from the route and recognizes proximity to the destination", () => {
  expect(tripProgress({ lat: .005, lng: .005 }, path, 2000, 1000)?.offRoute).toBe(true);
  expect(tripProgress(path[2], path, 2000, 1000, false, 20)?.nearDestination).toBe(true);
  expect(tripProgress(path[2], path, 2000, 1000, false, 90)?.nearDestination).toBe(false);
});
it("keeps coordinate-only estimates distinct from real road progress", () => {
  const p = tripProgress({ lat: .02, lng: .02 }, path, 2000, 1000, true)!;
  expect(p.distanceMeters).toBeGreaterThan(0);
  expect(p.offRoute).toBe(false);
  expect(tripProgress({ lat: NaN, lng: 0 }, path, 2000, 1000)).toBeNull();
  expect(tripProgress(path[0], [path[0], path[0]], 2000, 1000)).toBeNull();
});
