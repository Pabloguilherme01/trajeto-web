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

function freshnessMultiplier(value?: string | null) {
  if (!value) return 0.6;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0.6;
  const days = Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
  if (days <= 7) return 1;
  if (days <= 30) return 0.9;
  if (days <= 90) return 0.75;
  if (days <= 180) return 0.6;
  if (days <= 365) return 0.45;
  return 0.25;
}

export function stationDataConfidence(params: {
  anp?: AnpStation | null;
  local?: LocalStationRecord | null;
  price?: AnpPriceRecord | null;
}) {
  const scores = [
    params.anp ? 100 * freshnessMultiplier(params.anp.dataObtencao ?? params.anp.dataVinculacao ?? params.anp.dataPublicacao) : 0,
    Number.isFinite(params.anp?.latitude) && Number.isFinite(params.anp?.longitude)
      ? 90 * freshnessMultiplier(params.anp?.dataObtencao ?? params.anp?.dataVinculacao ?? params.anp?.dataPublicacao)
      : params.local?.mapData
        ? 70 * freshnessMultiplier(params.local.mapData.observedAt)
        : 0,
    params.local?.mapData?.phone ? 75 * freshnessMultiplier(params.local.mapData.observedAt) : 0,
    params.local?.mapData?.hours ? 70 * freshnessMultiplier(params.local.mapData.observedAt) : 0,
    params.price ? 92 * freshnessMultiplier(params.price.collectionDate) : 0,
  ].filter(score => score > 0);
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
}

export type StationDataConfidenceBand = "Baixa" | "Parcial" | "Boa" | "Alta";

export function stationDataConfidenceBand(value: number): StationDataConfidenceBand {
  const score = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
  if (score >= 90) return "Alta";
  if (score >= 70) return "Boa";
  if (score >= 50) return "Parcial";
  return "Baixa";
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
