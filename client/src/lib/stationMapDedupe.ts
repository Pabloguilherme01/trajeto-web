import { normalizeStationCnpj, sameStationIdentity } from "./stationListControls";

type StationMapIdentity = {
  cnpj?: string | null;
  placeId?: string | null;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

function mapAddressKey(value: string) {
  // Preserve the original map key format, including its trailing separators.
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ");
}

/**
 * Deduplicate mixed ANP, local, directory, live and offline map records.
 * A pair with two known CNPJs is only equal when their digits agree.
 * A missing CNPJ retains the old address and proximity fallback. The first
 * candidate wins so source priority, location and labels cannot change.
 */
export function deduplicateStationMapItems<T extends StationMapIdentity>(items: readonly T[]): T[] {
  const seenKeys = new Set<string>();
  const seenCnpjs = new Set<string>();
  const withoutCnpj: T[] = [];
  const merged: T[] = [];
  for (const station of items) {
    const cnpj = normalizeStationCnpj(station.cnpj);
    const key = station.cnpj
      ? "cnpj:" + cnpj
      : station.placeId
        ? "place:" + station.placeId
        : "address:" + mapAddressKey(station.address || station.name);
    if (seenKeys.has(key) || (cnpj && seenCnpjs.has(cnpj))) continue;

    // sameStationIdentity only considers addresses/points when at least one
    // party has no numeric CNPJ. Avoid testing known CNPJ pairs pointlessly.
    const candidates = cnpj ? withoutCnpj : merged;
    if (candidates.some(existing => sameStationIdentity(
      { cnpj: existing.cnpj, address: existing.address, lat: existing.lat, lng: existing.lng },
      { cnpj: station.cnpj, address: station.address, lat: station.lat, lng: station.lng },
    ))) continue;

    seenKeys.add(key);
    if (cnpj) seenCnpjs.add(cnpj);
    else withoutCnpj.push(station);
    merged.push(station);
  }
  return merged;
}
