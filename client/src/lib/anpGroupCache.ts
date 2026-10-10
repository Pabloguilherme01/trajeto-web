import { groupAnpFuelRows, type AnpFuelRow, type AnpStation } from "@shared/anpRevendedores";

/**
 * ANP snapshots are replaced as new arrays when refreshed. Their rows must
 * not be mutated in place; map-layer changes can then reuse the same grouping
 * and avoid repeating the per-CNPJ scan and locale sorting.
 */
const groups = new WeakMap<AnpFuelRow[], AnpStation[]>();

export function cachedGroupAnpFuelRows(rows: AnpFuelRow[]): AnpStation[] {
  const previous = groups.get(rows);
  if (previous) return previous;
  const grouped = groupAnpFuelRows(rows);
  groups.set(rows, grouped);
  return grouped;
}
