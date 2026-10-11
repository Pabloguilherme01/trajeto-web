import { matchesCatalogTerms, normalizeCatalogText, type createCatalogSearchIndex } from "./catalogSearch";
import type { QuickFilterPreset } from "./quickFilterPresets";

type SearchIndex = ReturnType<typeof createCatalogSearchIndex>;

/**
 * Discover applicable shortcuts in one pass over the loaded picker catalog.
 * The previous code scanned every destination once per shortcut, even when
 * all available shortcuts had already been found in the first records.
 * Preserve preset order and full token/substring matching semantics.
 */
export function availableMapPickerQuickFilters(
  rows: readonly { search: SearchIndex }[],
  options: readonly QuickFilterPreset[],
): QuickFilterPreset[] {
  if (!rows.length || !options.length) return [];
  const remaining = options.map((option, index) => ({
    index,
    terms: normalizeCatalogText(option.value).replace(/[ºª]/g, "").split(" ").filter(Boolean),
  }));
  const found = new Set<number>();
  for (const row of rows) {
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (matchesCatalogTerms(remaining[i].terms, row.search)) {
        found.add(remaining[i].index);
        remaining.splice(i, 1);
      }
    }
    if (!remaining.length) break;
  }
  return options.filter((_, index) => found.has(index));
}
