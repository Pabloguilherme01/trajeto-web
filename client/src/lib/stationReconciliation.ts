export type StationReferenceSource = "ANP" | "Google" | "local";

export type StationReference = {
  id?: string;
  placeId?: string;
  cnpj?: string | null;
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  source: StationReferenceSource;
  brand?: string | null;
};

const SOURCE_PRIORITY: Record<StationReferenceSource, number> = {
  ANP: 3,
  local: 2,
  Google: 1,
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedCnpj(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function coordinates(ref: StationReference) {
  return typeof ref.lat === "number" && Number.isFinite(ref.lat) &&
    typeof ref.lng === "number" && Number.isFinite(ref.lng)
    ? { lat: ref.lat, lng: ref.lng }
    : null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(value));
}

export function stationReferencesMatch(a: StationReference, b: StationReference) {
  const aCnpj = normalizedCnpj(a.cnpj);
  const bCnpj = normalizedCnpj(b.cnpj);
  if (aCnpj && bCnpj && aCnpj === bCnpj) return true;

  if (a.placeId && b.placeId && a.placeId === b.placeId) return true;

  const aCoords = coordinates(a);
  const bCoords = coordinates(b);
  if (aCoords && bCoords && haversineKm(aCoords, bCoords) <= 0.15) return true;

  const aAddress = normalize(a.address);
  const bAddress = normalize(b.address);
  if (aAddress && bAddress && aAddress === bAddress) return true;

  const aName = normalize(a.name);
  const bName = normalize(b.name);
  if (aName && bName && aName === bName) {
    if (!aAddress || !bAddress) return true;
    const aTokens = new Set(aAddress.split(" ").filter(token => token.length >= 4));
    const hits = bAddress.split(" ").filter(token => token.length >= 4 && aTokens.has(token)).length;
    return hits >= Math.min(3, Math.max(1, aTokens.size));
  }

  return false;
}

function mergeReference(primary: StationReference, secondary: StationReference): StationReference {
  return {
    ...primary,
    id: primary.id ?? secondary.id,
    placeId: primary.placeId ?? secondary.placeId,
    cnpj: primary.cnpj ?? secondary.cnpj,
    address: primary.address ?? secondary.address,
    lat: primary.lat ?? secondary.lat,
    lng: primary.lng ?? secondary.lng,
    brand: primary.brand ?? secondary.brand,
  };
}

export function dedupeStationReferences(references: StationReference[]) {
  const ordered = [...references].sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]);
  const merged: StationReference[] = [];

  for (const reference of ordered) {
    const matchIndex = merged.findIndex(existing => stationReferencesMatch(existing, reference));
    if (matchIndex === -1) {
      merged.push({ ...reference });
      continue;
    }
    merged[matchIndex] = mergeReference(merged[matchIndex], reference);
  }

  return merged;
}
