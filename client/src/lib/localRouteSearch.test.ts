import { expect, it } from "vitest";
import { matchesCatalogText } from "./catalogSearch";
import { filterLocalRoutePresets } from "./localRouteSearch";
import { ALL_LOCAL_ROUTE_DESTINATIONS, type LocalRoutePreset, type RouteDestinationCategoryFilter } from "./localRoutePresets";

function previousFilter(items: LocalRoutePreset[], query: string, category: RouteDestinationCategoryFilter) {
  return items.filter(item =>
    (category === "todos" || item.category === category) &&
    matchesCatalogText(query, [item.label, item.detail, item.destination, item.category])
  );
}

it("preserves order and results of all existing local destination searches", () => {
  const queries = ["", "  ", "Saúde", "SÃO JOSÉ", "CRAS II", "HEAL", "UPA", "2ª Delegacia", "180", "Rua B", "Parque da Barragem", "CNPJ", "não-existe-xyz"];
  const categories: RouteDestinationCategoryFilter[] = [
    "todos", "saude", "servicos", "educacao", "transporte", "combustivel", "compras", "alimentacao", "centro",
  ];
  for (const category of categories) for (const query of queries) {
    expect(filterLocalRoutePresets(ALL_LOCAL_ROUTE_DESTINATIONS, query, category).map(r => r.id))
      .toEqual(previousFilter(ALL_LOCAL_ROUTE_DESTINATIONS, query, category).map(r => r.id));
  }
});

it("keeps empty-query browsing independent and tracks a new immutable snapshot", () => {
  const a = ALL_LOCAL_ROUTE_DESTINATIONS;
  const original = filterLocalRoutePresets(a, "", "todos").map(item => item.id);
  const first = filterLocalRoutePresets(a, "", "todos");
  first.pop();
  expect(filterLocalRoutePresets(a).map(item => item.id)).toEqual(original);
  const second: LocalRoutePreset = {
    id: "new-map-reference",
    label: "Referência Nova",
    detail: "Nova referência",
    destination: "Referência Nova, Águas Lindas de Goiás",
    category: "centro",
  };
  const b = [...a, second];
  expect(filterLocalRoutePresets(b, "Referencia Nova", "centro").at(-1)).toBe(second);
  expect(filterLocalRoutePresets(a, "Referencia Nova", "centro")).toEqual([]);
});

it("does not turn a partial number into an address or change exact short-token matching", () => {
  const items: LocalRoutePreset[] = [
    { id: "a", label: "Rua 12", detail: "Rua", destination: "Rua 12", category: "centro" },
    { id: "b", label: "Rua 123", detail: "Rua", destination: "Rua 123", category: "centro" },
  ];
  expect(filterLocalRoutePresets(items, "12").map(item => item.id)).toEqual(["a"]);
  expect(filterLocalRoutePresets(items, "123").map(item => item.id)).toEqual(["b"]);
});
