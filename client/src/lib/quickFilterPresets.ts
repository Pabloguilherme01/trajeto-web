import { normalizeCatalogText } from "./catalogSearch";

export type QuickFilterPreset = {
  label: string;
  value: string;
};

export type CategorizedQuickFilterPreset = QuickFilterPreset & {
  category: "alimentacao" | "saude" | "combustivel" | "compras" | "educacao" | "servicos" | "transporte";
};

export const CITY_MAP_QUICK_FILTERS: CategorizedQuickFilterPreset[] = [
  { label: "UPA", value: "upa", category: "saude" },
  { label: "UBS", value: "ubs", category: "saude" },
  { label: "Hospitais", value: "hospital", category: "saude" },
  { label: "Creches", value: "creche", category: "educacao" },
  { label: "CRAS", value: "cras", category: "servicos" },
  { label: "Postos", value: "posto", category: "combustivel" },
  { label: "Mercados", value: "mercado", category: "compras" },
  { label: "Escolas", value: "escola", category: "educacao" },
  { label: "Prefeitura", value: "prefeitura", category: "servicos" },
  { label: "Shopping", value: "shopping", category: "compras" },
  { label: "Comer", value: "alimentacao", category: "alimentacao" },
  { label: "Farmácias", value: "farmacias", category: "compras" },
  { label: "Oficinas", value: "oficinas", category: "servicos" },
  { label: "Padarias", value: "padarias", category: "compras" },
  { label: "Roupas", value: "roupas", category: "compras" },
  { label: "Beleza", value: "beleza", category: "servicos" },
  { label: "Materiais", value: "materiais", category: "compras" },
  { label: "Rodoviária", value: "rodoviaria", category: "transporte" },
];

function plain(options: CategorizedQuickFilterPreset[]): QuickFilterPreset[] {
  return options.map(({ label, value }) => ({ label, value }));
}

// Business aliases need the full company catalog, not only prepared routes.
const businessOnlyFilters = new Set(["alimentacao", "farmacias", "oficinas", "padarias", "roupas", "beleza", "materiais"]);
const routeFilters = CITY_MAP_QUICK_FILTERS.filter(item => !businessOnlyFilters.has(item.value));

export const COMMON_DESTINATION_QUICK_FILTERS = plain(
  routeFilters.filter(item => item.label !== "Rodoviária")
);

export const ROUTE_QUICK_FILTERS = plain(routeFilters);

export const PLANNER_LOCATION_QUICK_FILTERS: QuickFilterPreset[] = [
  ...ROUTE_QUICK_FILTERS,
  { label: "Bairros", value: "jardim" },
];

// Quick-filter lists are immutable during a render. Index the normalized
// option values only once per list identity instead of repeating Unicode
// normalization over every chip when the user types or switches categories.
const normalizedOptionIndexes = new WeakMap<readonly QuickFilterPreset[], Map<string, QuickFilterPreset>>();

function indexQuickFilterOptions<T extends QuickFilterPreset>(options: readonly T[]): ReadonlyMap<string, T> {
  let index = normalizedOptionIndexes.get(options) as Map<string, T> | undefined;
  if (!index) {
    index = new Map<string, T>();
    for (const option of options) {
      const normalized = normalizeCatalogText(option.value);
      // Array.find returned the first matching option; preserve that rule.
      if (!index.has(normalized)) index.set(normalized, option);
    }
    normalizedOptionIndexes.set(options, index);
  }
  return index;
}

export function isQuickFilterValue(
  value: string,
  options: readonly QuickFilterPreset[]
) {
  const normalized = normalizeCatalogText(value);
  return Boolean(normalized && indexQuickFilterOptions(options).has(normalized));
}

export function quickFilterMatchesCategory(
  value: string,
  category: string,
  options: readonly CategorizedQuickFilterPreset[] = CITY_MAP_QUICK_FILTERS
) {
  if (category === "todos") return true;
  const match = indexQuickFilterOptions(options).get(normalizeCatalogText(value));
  return !match || match.category === category;
}

export function quickFilterCategory(
  value: string,
  options: readonly CategorizedQuickFilterPreset[] = CITY_MAP_QUICK_FILTERS
) {
  return indexQuickFilterOptions(options).get(normalizeCatalogText(value))?.category;
}
