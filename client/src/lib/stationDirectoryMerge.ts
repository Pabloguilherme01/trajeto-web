import { normalizeStationCnpj, sameStationIdentity, type StationIdentityInput } from "./stationListControls";

type LocalStation = {
  cnpj: string;
  address?: string | null;
  neighborhood?: string | null;
  anp?: { latitude?: number | null; longitude?: number | null } | null;
};
type OfficialStation = {
  cnpj: string;
  endereco?: string | null;
  bairro?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
export type StationDirectoryRow<L, A> = { key: string; local: L | null; anp: A | null };

function rowIdentity<L extends LocalStation, A extends OfficialStation>(
  row: StationDirectoryRow<L, A>,
): StationIdentityInput {
  return {
    cnpj: row.anp?.cnpj || row.local?.cnpj,
    address: [row.anp?.endereco || row.local?.address, row.anp?.bairro || row.local?.neighborhood]
      .filter(Boolean).join(" "),
    lat: Number(row.anp?.latitude ?? row.local?.anp?.latitude),
    lng: Number(row.anp?.longitude ?? row.local?.anp?.longitude),
  };
}

/**
 * Match the former .some(sameStationIdentity) behavior without doing an
 * O(local x ANP) scan for records with CNPJs. A missing CNPJ still uses the
 * original address/coordinate fallback; different known CNPJs never merge.
 * Keep catalog order and the last official snapshot for duplicate CNPJ keys.
 */
export function mergeStationDirectoryRows<L extends LocalStation, A extends OfficialStation>(
  locals: readonly L[],
  official: readonly A[],
): StationDirectoryRow<L, A>[] {
  const officialByCnpj = new Map(official.map(station => [
    normalizeStationCnpj(station.cnpj), station,
  ] as const));
  const rows: StationDirectoryRow<L, A>[] = locals.map(local => {
    const key = normalizeStationCnpj(local.cnpj) || local.cnpj;
    return { key, local, anp: officialByCnpj.get(key) ?? null };
  });
  const knownCnpjs = new Set<string>();
  const withoutCnpj: StationDirectoryRow<L, A>[] = [];
  for (const row of rows) {
    const cnpj = normalizeStationCnpj(row.anp?.cnpj || row.local?.cnpj);
    if (cnpj) knownCnpjs.add(cnpj);
    else withoutCnpj.push(row);
  }
  for (const anp of official) {
    const normalizedCnpj = normalizeStationCnpj(anp.cnpj);
    if (normalizedCnpj && knownCnpjs.has(normalizedCnpj)) continue;
    const identity: StationIdentityInput = {
      cnpj: anp.cnpj,
      address: [anp.endereco, anp.bairro].filter(Boolean).join(" "),
      lat: Number(anp.latitude),
      lng: Number(anp.longitude),
    };
    // Both sides with CNPJs can only match by CNPJ. Only unknown-CNPJ
    // rows need the original secondary address/coordinate comparison.
    const candidates = normalizedCnpj ? withoutCnpj : rows;
    if (candidates.some(row => sameStationIdentity(rowIdentity(row), identity))) continue;
    const key = normalizedCnpj || anp.cnpj;
    const next: StationDirectoryRow<L, A> = { key, local: null, anp };
    rows.push(next);
    if (normalizedCnpj) knownCnpjs.add(normalizedCnpj);
    else withoutCnpj.push(next);
  }
  return rows;
}
