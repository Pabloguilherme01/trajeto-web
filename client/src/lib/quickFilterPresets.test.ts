import { expect, it } from "vitest";
import {
  CITY_MAP_QUICK_FILTERS,
  ROUTE_QUICK_FILTERS,
  isQuickFilterValue,
  quickFilterCategory,
  quickFilterMatchesCategory,
} from "./quickFilterPresets";

it("recognizes quick filters without accents", () => {
  expect(isQuickFilterValue("Rodoviária", ROUTE_QUICK_FILTERS)).toBe(true);
  expect(quickFilterCategory("Rodoviária")).toBe("transporte");
});

it("detects when a quick filter conflicts with the selected category", () => {
  expect(quickFilterMatchesCategory("posto", "combustivel", CITY_MAP_QUICK_FILTERS)).toBe(true);
  expect(quickFilterMatchesCategory("posto", "saude", CITY_MAP_QUICK_FILTERS)).toBe(false);
  expect(quickFilterMatchesCategory("busca digitada", "saude", CITY_MAP_QUICK_FILTERS)).toBe(true);
});
