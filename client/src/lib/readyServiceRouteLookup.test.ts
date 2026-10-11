import { expect, it } from "vitest";
import { selectExistingRoutesById } from "./readyServiceRouteLookup";
import { ALL_LOCAL_ROUTE_DESTINATIONS } from "./localRoutePresets";
import {
  READY_SERVICE_ROUTES, READY_ROUTE_SERVICE_BY_ROUTE_ID,
  READY_ROUTE_GROUP_IDS, READY_ROUTE_GROUP_COUNTS,
} from "./publicServicesPresentation";

it("preserves first-match lookup, duplicate requested IDs and output order", () => {
  const all = [
    { id: "a", name: "A original" },
    { id: "b", name: "B" },
    { id: "a", name: "A duplicate" },
    { id: "c", name: "C" },
  ];
  const ids = ["b", "missing", "a", "a", "c"];
  const original = ids.map(id => all.find(item => item.id === id)).filter(Boolean);
  expect(selectExistingRoutesById(all, ids)).toEqual(original);
  expect(selectExistingRoutesById(all, ids)[1]).toBe(all[0]);
});

it("preserves the official ready-route directory from the former find loop", () => {
  const requested = Array.from(new Set([
    "rodoviaria", "praca-da-biblia", ...READY_ROUTE_SERVICE_BY_ROUTE_ID.keys(),
  ]));
  const original = requested
    .map(id => ALL_LOCAL_ROUTE_DESTINATIONS.find(route => route.id === id))
    .filter(Boolean);
  expect(READY_SERVICE_ROUTES).toEqual(original);
  expect(READY_SERVICE_ROUTES.every(route => route && route.id)).toBe(true);
  for (const [group, ids] of READY_ROUTE_GROUP_IDS) {
    const count = READY_SERVICE_ROUTES.filter(route => ids.has(route.id)).length;
    expect(READY_ROUTE_GROUP_COUNTS.get(group)).toBe(count);
  }
});

it("handles long catalogs and new snapshots without reusing stale indexes", () => {
  const all = Array.from({ length: 4500 }, (_, i) => ({ id: "route-" + i, label: "Local " + i }));
  const ids = ["route-44", "missing", "route-4499", "route-44", "route-0"];
  const updated = all.map((row, i) => i === 44 ? { ...row, label: "Atualizado" } : row);
  const expected = ids.map(id => all.find(x => x.id === id)).filter(Boolean);
  expect(selectExistingRoutesById(all, ids)).toEqual(expected);
  expect(selectExistingRoutesById(updated, ids)[0].label).toBe("Atualizado");
  expect(selectExistingRoutesById(all, [])).toEqual([]);
  expect(selectExistingRoutesById([], ids)).toEqual([]);
});
