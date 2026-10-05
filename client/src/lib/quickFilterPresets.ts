import { normalizeCatalogText } from "./catalogSearch";

export type QuickFilterPreset = {
  label: string;
  value: string;
};

export type CategorizedQuickFilterPreset = QuickFilterPreset & {
  category: "saude" | "combustivel" | "compras" | "educacao" | "servicos" | "transporte";
};

export const CITY_MAP_QUICK_FILTERS: CategorizedQuickFilterPreset[] = [
  { label: "UPA", value: "upa", category: "saude" },
  { label: "Postos", value: "posto", category: "combustivel" },
  { label: "Mercados", value: "mercado", category: "compras" },
  { label: "Escolas", value: "escola", category: "educacao" },
  { label: "Prefeitura", value: "prefeitura", category: "servicos" },
  { label: "Shopping", value: "shopping", category: "compras" },
  { label: "Rodoviária", value: "rodoviaria", category: "transporte" },
];

function plain(options: CategorizedQuickFilterPreset[]): QuickFilterPreset[] {
  return options.map(({ label, value }) => ({ label, value }));
}

export const COMMON_DESTINATION_QUICK_FILTERS = plain(
  CITY_MAP_QUICK_FILTERS.filter(item => item.label !== "Rodoviária")
);

export const ROUTE_QUICK_FILTERS = plain(CITY_MAP_QUICK_FILTERS);

export const PLANNER_LOCATION_QUICK_FILTERS: QuickFilterPreset[] = [
  ...ROUTE_QUICK_FILTERS,
  { label: "Bairros", value: "jardim" },
];

export function isQuickFilterValue(
  value: string,
  options: readonly QuickFilterPreset[]
) {
  const normalized = normalizeCatalogText(value);
  return Boolean(
    normalized &&
      options.some(option => normalizeCatalogText(option.value) === normalized)
  );
}

export function quickFilterMatchesCategory(
  value: string,
  category: string,
  options: readonly CategorizedQuickFilterPreset[] = CITY_MAP_QUICK_FILTERS
) {
  if (category === "todos") return true;
  const normalized = normalizeCatalogText(value);
  const match = options.find(
    option => normalizeCatalogText(option.value) === normalized
  );
  return !match || match.category === category;
}

export function quickFilterCategory(
  value: string,
  options: readonly CategorizedQuickFilterPreset[] = CITY_MAP_QUICK_FILTERS
) {
  const normalized = normalizeCatalogText(value);
  return options.find(
    option => normalizeCatalogText(option.value) === normalized
  )?.category;
}
