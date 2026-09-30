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


export type StationEvidenceItem = {
  key: "cadastro" | "preco" | "mapa";
  label: string;
  source: "ANP" | "Mapa" | "local";
  at: string | null;
  freshness: string;
};

export function stationEvidence(params: {
  anp?: AnpStation | null;
  local?: LocalStationRecord | null;
  price?: AnpPriceRecord | null;
}): StationEvidenceItem[] {
  return [
    { key: "cadastro", label: "Cadastro", source: params.anp ? "ANP" : "local", at: params.anp?.dataObtencao || params.local?.verifiedAt || null, freshness: freshnessLabel(params.anp?.dataObtencao || params.local?.verifiedAt) },
    { key: "preco", label: "Preço", source: "ANP", at: params.price?.collectionDate || null, freshness: freshnessLabel(params.price?.collectionDate) },
    { key: "mapa", label: "Mapa", source: "Mapa", at: params.local?.mapData?.observedAt || null, freshness: freshnessLabel(params.local?.mapData?.observedAt) },
  ];
}
