import type { AnpPriceSnapshot } from "@/lib/anpPrices";

export type StationDirectorySource = "ANP" | "mapa" | "Google" | "local";

export interface StationDirectoryModel {
  key: string;
  name: string;
  cnpj: string | null;
  address: string;
  neighborhood: string | null;
  brand: string | null;
  lat: number | null;
  lng: number | null;
  source: StationDirectorySource;
  hasOfficialRecord: boolean;
  hasCoordinates: boolean;
  hasPrice: boolean;
  price: number | null;
  priceDate: string | null;
  dataCompleteness: number;
}

export function buildStationDirectoryModel(input: {
  key: string;
  name: string;
  cnpj?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  brand?: string | null;
  lat?: number | null;
  lng?: number | null;
  source: StationDirectorySource;
  official?: boolean;
  priceSnapshot?: AnpPriceSnapshot | null;
  price?: number | null;
  priceDate?: string | null;
}): StationDirectoryModel {
  const lat = Number.isFinite(Number(input.lat)) ? Number(input.lat) : null;
  const lng = Number.isFinite(Number(input.lng)) ? Number(input.lng) : null;
  const price = Number.isFinite(Number(input.price)) ? Number(input.price) : null;
  const completeness =
    (input.official ? 40 : 0) +
    (lat != null && lng != null ? 25 : 0) +
    (price != null ? 25 : 0) +
    (input.address ? 10 : 0);

  return {
    key: input.key,
    name: input.name || "Posto",
    cnpj: input.cnpj ?? null,
    address: input.address ?? "",
    neighborhood: input.neighborhood ?? null,
    brand: input.brand ?? null,
    lat,
    lng,
    source: input.source,
    hasOfficialRecord: Boolean(input.official),
    hasCoordinates: lat != null && lng != null,
    hasPrice: price != null,
    price,
    priceDate: input.priceDate ?? input.priceSnapshot?.retrievedAt ?? null,
    dataCompleteness: completeness,
  };
}
