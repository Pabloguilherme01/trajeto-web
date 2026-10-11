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

it("keeps company-only aliases out of prepared-route catalogs", () => {
  for (const value of ["alimentacao", "farmacias", "oficinas", "padarias", "roupas", "beleza", "materiais"]) {
    expect(isQuickFilterValue(value, CITY_MAP_QUICK_FILTERS)).toBe(true);
    expect(isQuickFilterValue(value, ROUTE_QUICK_FILTERS)).toBe(false);
  }
});

it("provides practical public-health, education and assistance quick filters", () => {
  for (const [label, value, category] of [
    ["UBS", "ubs", "saude"],
    ["Hospitais", "hospital", "saude"],
    ["Creches", "creche", "educacao"],
    ["CRAS", "cras", "servicos"],
  ]) {
    expect(CITY_MAP_QUICK_FILTERS.some(item =>
      item.label === label && item.value === value && item.category === category
    )).toBe(true);
    expect(quickFilterCategory(value)).toBe(category);
    expect(quickFilterMatchesCategory(value, category)).toBe(true);
    expect(isQuickFilterValue(value, ROUTE_QUICK_FILTERS)).toBe(true);
  }
});

it("keeps first-match semantics for duplicate normalized quick-filter values", () => {
  const options = [
    { label: "Hospital", value: "hospital", category: "saude" as const },
    { label: "Outra grafia", value: "HOSPITAL", category: "servicos" as const },
    { label: "UBS", value: "ubs", category: "saude" as const },
  ];
  expect(quickFilterCategory(" HOSPITAL ", options)).toBe("saude");
  expect(quickFilterMatchesCategory("hospital", "saude", options)).toBe(true);
  expect(quickFilterMatchesCategory("hospital", "servicos", options)).toBe(false);
  expect(isQuickFilterValue("hospital", options)).toBe(true);
  expect(isQuickFilterValue("", options)).toBe(false);
  expect(quickFilterMatchesCategory("unrecognized", "servicos", options)).toBe(true);
});

it("keeps custom filter lists independent when options are replaced", () => {
  const previous = [{ label: "Postos", value: "posto", category: "combustivel" as const }];
  const updated = [{ label: "UPA", value: "upa", category: "saude" as const }];
  expect(quickFilterCategory("posto", previous)).toBe("combustivel");
  expect(quickFilterCategory("posto", updated)).toBeUndefined();
  expect(quickFilterCategory("upa", updated)).toBe("saude");
  expect(quickFilterCategory("posto", previous)).toBe("combustivel");
});
