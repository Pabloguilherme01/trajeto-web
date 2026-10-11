import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";

/**
 * Prepare a text-search closure per immutable station snapshot, indexing only
 * after the first actual text query. Browsing, facets and fuel filters can
 * therefore display the full directory without normalizing every record.
 * Later keystrokes reuse the same tokens. No persistence, network or location.
 */
export function buildIndexedStationDirectorySearch<T>(
  records: readonly T[],
  fields: (record: T) => readonly (string | null | undefined)[],
) {
  type IndexedEntry = { record: T; index: ReturnType<typeof createCatalogSearchIndex> };
  let entries: IndexedEntry[] | null = null;
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
  let previous: { terms: string[]; matches: IndexedEntry[] } | null = null;

  return (query: string, secondaryQuery = ""): T[] => {
    // Both text boxes are AND filters; combining their tokens preserves the
    // two independent matchesCatalogTerms calls from the previous version.
    const terms = [...termsFor(query), ...termsFor(secondaryQuery)];
    if (!terms.length) {
      previous = null;
      return records.slice();
    }
    // Non-text filter changes can invoke this search again with the exact same
    // normalized terms. Reuse the last match list without rescanning tokens.
    // Return a fresh array so pagination and consumers cannot mutate the cache.
    if (previous && previous.terms.length === terms.length &&
        previous.terms.every((term, index) => term === terms[index])) {
      return previous.matches.map(entry => entry.record);
    }
    // Only a non-empty text query pays for building the index. Reuse it
    // even if the user clears the search and later types another query.
    if (!entries) {
      entries = records.map(record => ({
        record,
        index: createCatalogSearchIndex(fields(record).filter((value): value is string => Boolean(value))),
      }));
    }
    const candidates = previous && canNarrowFrom(previous.terms, terms)
      ? previous.matches : entries;
    const matches = candidates.filter(entry => matchesCatalogTerms(terms, entry.index));
    previous = { terms, matches };
    // Never expose a cached mutable array to UI pagination or callers.
    return matches.map(entry => entry.record);
  };
}
