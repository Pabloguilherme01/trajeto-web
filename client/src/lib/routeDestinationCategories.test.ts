import { expect, it } from "vitest";
import { CITY_MAP_CATEGORIES, readCityMapLayer } from "./cityMapLayers";
import { ROUTE_DESTINATION_CATEGORIES } from "./routeDestinationCategories";
import { ROUTE_DESTINATION_CATEGORIES as legacyRouteCategories } from "./localRoutePresets";

it("retains the existing category exports without a duplicated catalog", () => {
  expect(legacyRouteCategories).toBe(ROUTE_DESTINATION_CATEGORIES);
  expect(ROUTE_DESTINATION_CATEGORIES.map(({ value, label }) => [value, label]))
    .toEqual([
      ["todos", "Tudo"], ["saude", "Saúde"], ["educacao", "Educação"],
      ["servicos", "Serviços"], ["compras", "Compras"],
      ["transporte", "Transporte"], ["combustivel", "Postos"],
      ["alimentacao", "Alimentação"], ["centro", "Cidade"],
    ]);
});

it("keeps the map's additional public layers and shareable filter values", () => {
  const values = CITY_MAP_CATEGORIES.map(category => category.value);
  expect(values).toEqual([
    "todos", "saude", "seguranca", "educacao",
    "servicos", "compras", "transporte", "meio-ambiente",
    "combustivel", "alimentacao", "centro",
  ]);
  for (const value of values) expect(readCityMapLayer(value)).toBe(value);
  expect(readCityMapLayer("camada-desconhecida")).toBe("todos");
});
