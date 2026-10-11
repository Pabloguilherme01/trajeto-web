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

  // Only the last query is retained. Avoid a growing cache as the user types.
  // A longer substring can only narrow an earlier substring match. Whole
  // tokens (<=3 characters or numeric CNPJs) cannot safely be extended:
  // "pos" as an exact token excludes "posto", for example.
  const canNarrowFrom = (previous: readonly string[], next: readonly string[]) =>
    previous.length > 0 && previous.every(term =>
      next.some(candidate => candidate === term ||
        (term.length > 3 && !/^[0-9]+$/.test(term) && candidate.includes(term)))
    );
  let previous: { terms: string[]; matches: typeof entries } | null = null;

  return (query: string, secondaryQuery = ""): T[] => {
    // Both text boxes are AND filters; combining their tokens preserves the
    // two independent matchesCatalogTerms calls from the previous version.
    const terms = [...termsFor(query), ...termsFor(secondaryQuery)];
    if (!terms.length) {
      previous = null;
      return records.slice();
    }
    const candidates = previous && canNarrowFrom(previous.terms, terms)
      ? previous.matches : entries;
    const matches = candidates.filter(entry => matchesCatalogTerms(terms, entry.index));
    previous = { terms, matches };
    // Never expose a cached mutable array to UI pagination or callers.
    return matches.map(entry => entry.record);
  };
}
