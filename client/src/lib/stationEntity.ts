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
  // Weighted completeness score. Missing dimensions reduce confidence instead of
  // disappearing from the denominator, so ANP cadastro alone cannot become 100%.
  const score =
    (params.anp ? 35 : 0) +
    (Number.isFinite(params.anp?.latitude) && Number.isFinite(params.anp?.longitude)
      ? 20
      : Number.isFinite(params.local?.anp?.latitude) && Number.isFinite(params.local?.anp?.longitude)
        ? 15
        : params.local?.mapData
          ? 5
          : 0) +
    (params.local?.mapData?.phone ? 10 : 0) +
    (params.local?.mapData?.hours ? 10 : 0) +
    (params.price ? 25 : 0);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function freshnessDays(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

export function freshnessLevel(value?: string | null): "unknown" | "fresh" | "recent" | "stale" {
  const days = freshnessDays(value);
  if (days == null) return "unknown";
  if (days <= 7) return "fresh";
  if (days <= 21) return "recent";
  return "stale";
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
