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
  const anpFreshness = freshnessMultiplier(params.anp?.dataObtencao ?? params.anp?.dataVinculacao ?? params.anp?.dataPublicacao);
  const mapFreshness = freshnessMultiplier(params.local?.mapData?.observedAt);
  const priceFreshness = freshnessMultiplier(params.price?.collectionDate);
  const identity = params.anp
    ? 100 * anpFreshness
    : params.local?.mapData
      ? 60 * mapFreshness
      : 0;
  const location = Number.isFinite(params.anp?.latitude) && Number.isFinite(params.anp?.longitude)
    ? 100 * anpFreshness
    : params.local?.mapData
      ? 70 * mapFreshness
      : 0;
  const contact = params.local?.mapData?.phone ? 100 * mapFreshness : 0;
  const hours = params.local?.mapData?.hours ? 100 * mapFreshness : 0;
  const price = params.price ? 100 * priceFreshness : 0;

  const weightedScore =
    identity * 0.30 +
    location * 0.25 +
    contact * 0.15 +
    hours * 0.10 +
    price * 0.20;

  return Math.round(weightedScore);
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
