import { expect, it } from "vitest";
import { distanceToRoute, nearbyRouteReferences } from "./routeMapLogic";

it("finds a hospital near the middle of a long segment rather than only near vertices", () => {
  const route = [{ lat: -15.74637, lng: -48.38 }, { lat: -15.74637, lng: -48.17 }];
  expect(distanceToRoute({ lat: -15.74637, lng: -48.27584 }, route)).toBeLessThan(1);
  expect(nearbyRouteReferences(undefined, undefined, route).some(item => item.id === "route-reference:heal")).toBe(true);
});

it("clamps to endpoints and tolerates repeated or invalid vertices", () => {
  const origin = { lat: -15.75, lng: -48.28 };
  expect(distanceToRoute(origin, [])).toBe(Infinity);
  expect(distanceToRoute(origin, [origin, origin])).toBe(0);
  expect(distanceToRoute(origin, [{ lat: NaN, lng: 0 }])).toBe(Infinity);
  expect(distanceToRoute({ lat: -15.75, lng: -48.30 }, [origin, { lat: -15.75, lng: -48.27 }])).toBeGreaterThan(2000);
});
