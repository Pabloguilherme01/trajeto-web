import { expect, it } from "vitest";
import { loadBusinessCatalog, normalizeBusinessRows, resolveBusinessPoint } from "./businessCatalog";
import { calculateOfflineRoute } from "./publicRouting";
import { filterCityAtlas } from "./cityAtlas";

it("imports every unique CNPJ, preserves precision and keeps unlocated companies searchable", async () => {
  const items = await loadBusinessCatalog();
  expect(items).toHaveLength(21486);
  expect(new Set(items.map(item => item.id)).size).toBe(21486);
  expect(items.filter(item => item.lat !== undefined)).toHaveLength(21319);
  const amag = filterCityAtlas(items, "42.115.689/0001-40", "todos");
  expect(amag).toHaveLength(1);
  expect(amag[0].coordinateLabel).toContain("Quadra (CNEFE)");
  expect(amag[0].coordinateKind).toBe("area-reference");
  expect(resolveBusinessPoint("42.115.689/0001-40")).toEqual({ lat: -15.782635, lng: -48.294036 });
  expect(resolveBusinessPoint("42115689000140")).toEqual({ lat: -15.782635, lng: -48.294036 });
  expect(resolveBusinessPoint("JARDIM SANTA LUCIA")).toBeNull();
  expect(resolveBusinessPoint(amag[0].address!)).toBeNull();
  const unlocated = items.find(item => item.lat === undefined)!;
  expect(filterCityAtlas(items, unlocated.business!.cnpj, "todos")).toContain(unlocated);
  expect(resolveBusinessPoint(unlocated.business!.cnpj)).toBeNull();
  expect(await loadBusinessCatalog()).toBe(items);
});

it("rejects malformed rows and coordinates instead of inventing locations", () => {
  expect(normalizeBusinessRows(null)).toEqual([]);
  expect(normalizeBusinessRows({ schema: 1, strings: [], rows: [[0]] })).toEqual([]);
  expect(normalizeBusinessRows({ schema: 2, strings: [], rows: [] })).toEqual([]);
});

it("routes a company origin by CNPJ without rounding its public catalog coordinates", async () => {
  const route = await calculateOfflineRoute("42.115.689/0001-40", "HEAL", "driving");
  expect(route.origin).toEqual({ lat: -15.782635, lng: -48.294036 });
  expect(route.destination).toEqual({ lat: -15.74637, lng: -48.27584 });
  expect(route.source).toBe("local-estimate");
});
