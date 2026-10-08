import { expect, it, vi } from "vitest";
import * as search from "./catalogSearch";
import { LOCAL_READY_ROUTES } from "./localRoutePresets";
import { filterReadyRoutes } from "./readyRouteSearch";

it("searches complete routes and keeps category and departure filters", () => {
  expect(filterReadyRoutes("", "todos", "todos")).toHaveLength(LOCAL_READY_ROUTES.length);
  const matches = filterReadyRoutes("rodoviaria", "transporte", "centro");
  expect(matches.length).toBeGreaterThan(0);
  expect(matches.every(route => route.originId === "centro" && route.category === "transporte" && route.label.includes("Rodoviária"))).toBe(true);
  expect(filterReadyRoutes("not-a-destination-123", "todos", "todos")).toEqual([]);
});

it("reuses prepared indexes across searches and normalizes the query once", () => {
  filterReadyRoutes("__prepare__", "todos", "todos");
  const build = vi.spyOn(search, "createCatalogSearchIndex");
  const normalize = vi.spyOn(search, "normalizeCatalogText");
  try {
    expect(filterReadyRoutes("HEAL", "todos", "todos").length).toBeGreaterThan(0);
    expect(build).not.toHaveBeenCalled();
    expect(normalize).toHaveBeenCalledTimes(1);
  } finally { build.mockRestore(); normalize.mockRestore(); }
});
