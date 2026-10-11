import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";

/**
 * Build normalized search tokens once per immutable directory snapshot.
 * Keystrokes and filter changes scan prepared tokens instead of rejoining and
 * normalizing every address, neighborhood, brand and CNPJ on every render.
 * No persistence, network requests or personal location is involved.
 */
export function buildIndexedStationDirectorySearch<T>(
  records: readonly T[],
  fields: (record: T) => readonly (string | null | undefined)[],
) {
  const entries = records.map(record => ({
    record,
    index: createCatalogSearchIndex(fields(record).filter((value): value is string => Boolean(value))),
  }));
  const termsFor = (query: string) =>
    normalizeCatalogText(query).replace(/[ºª]/g, "").split(" ").filter(Boolean);

  return (query: string, secondaryQuery = ""): T[] => {
    const terms = termsFor(query);
    const secondaryTerms = termsFor(secondaryQuery);
    if (!terms.length && !secondaryTerms.length) return records.slice();
    const results: T[] = [];
    for (const entry of entries) {
      if (matchesCatalogTerms(terms, entry.index) &&
          matchesCatalogTerms(secondaryTerms, entry.index)) {
        results.push(entry.record);
      }
    }
    return results;
  };
}
