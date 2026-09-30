import type { AnpStation } from "@shared/anpRevendedores";
import type { AnpPriceRecord } from "@shared/anpPrices";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";

export type StationCatalogStatus = "anp-confirmed" | "anp-map-reconciled" | "map-reference" | "unreconciled";

export function stationCatalogStatus(anp?: AnpStation | null, local?: LocalStationRecord | null): StationCatalogStatus {
  if (anp && local?.mapData) return "anp-map-reconciled";
  if (anp) return "anp-confirmed";
  if (local?.mapData) return "map-reference";
  return "unreconciled";
}

export function stationCatalogStatusLabel(status: StationCatalogStatus) {
  return {
    "anp-confirmed": "ANP confirmado",
    "anp-map-reconciled": "ANP + mapa conciliado",
    "map-reference": "Referência de mapa",
    unreconciled: "Não conciliado",
  }[status];
}

export function stationDataConfidence(params: {
  anp?: AnpStation | null;
  local?: LocalStationRecord | null;
  price?: AnpPriceRecord | null;
}) {
  const scores = [
    params.anp ? 100 : 0,
    Number.isFinite(params.anp?.latitude) && Number.isFinite(params.anp?.longitude) ? 90 : params.local?.mapData ? 70 : 0,
    params.local?.mapData?.phone ? 75 : 0,
    params.local?.mapData?.hours ? 70 : 0,
    params.price ? 92 : 0,
  ].filter(score => score > 0);
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
}

export function freshnessLabel(value?: string | null) {
  if (!value) return "data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data não informada";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return "há " + days + " dias";
}


export type LocationEntity = {
  id: string;
  kind: "station";
  name: string;
  address: string;
  neighborhood: string | null;
  phone: string | null;
  website: string | null;
  coordinates: { lat: number; lng: number } | null;
  source: string;
  updatedAt: string | null;
  confidence: number;
  services: string[];
};

export function buildLocationEntity(local?: LocalStationRecord | null, anp?: AnpStation | null, price?: AnpPriceRecord | null): LocationEntity | null {
  const id = local?.id || anp?.cnpj || null;
  if (!id) return null;
  const coordinates =
    Number.isFinite(anp?.latitude) && Number.isFinite(anp?.longitude)
      ? { lat: Number(anp?.latitude), lng: Number(anp?.longitude) }
      : Number.isFinite(local?.anp?.latitude) && Number.isFinite(local?.anp?.longitude)
        ? { lat: Number(local?.anp?.latitude), lng: Number(local?.anp?.longitude) }
        : null;
  const address = [
    anp?.endereco || local?.address,
    anp?.complemento,
    anp?.bairro || local?.neighborhood,
    anp?.municipio || "Águas Lindas de Goiás",
    anp?.uf || "GO",
  ].filter(Boolean).join(", ");
  const services = [
    ...(local?.mapData?.operationalStatus === "open" ? ["aberto na referência de mapa"] : []),
    ...(local?.mapData?.hours ? ["horário informado"] : []),
    ...(local?.mapData?.phone ? ["telefone"] : []),
    ...(price ? ["preço ANP"] : []),
    ...(anp?.products?.length ? ["produtos ANP"] : []),
  ];
  return {
    id,
    kind: "station",
    name: local?.displayName || anp?.razaoSocial || "Posto",
    address: address || "Endereço não consolidado",
    neighborhood: anp?.bairro || local?.neighborhood || null,
    phone: local?.mapData?.phone || null,
    website: local?.mapData?.website || null,
    coordinates,
    source: anp ? "ANP" : local?.mapData ? "Catálogo + mapas" : "Catálogo local",
    updatedAt: local?.mapData?.observedAt || anp?.dataObtencao || local?.verifiedAt || null,
    confidence: stationDataConfidence({ anp, local, price }),
    services,
  };
}
