/**
 * Small, dependency-free route category vocabulary.
 * Keep this apart from localRoutePresets: that module assembles the offline
 * atlas, ANP and service data, which are unnecessary for reading a map filter.
 */
export type RouteDestinationCategory =
  | "saude" | "educacao" | "servicos" | "transporte"
  | "compras" | "combustivel" | "centro" | "alimentacao";
export type RouteDestinationCategoryFilter = "todos" | RouteDestinationCategory;

export const ROUTE_DESTINATION_CATEGORIES: ReadonlyArray<{
  value: RouteDestinationCategoryFilter;
  label: string;
}> = [
  { value: "todos", label: "Tudo" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "servicos", label: "Serviços" },
  { value: "compras", label: "Compras" },
  { value: "transporte", label: "Transporte" },
  { value: "combustivel", label: "Postos" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "centro", label: "Cidade" },
];
