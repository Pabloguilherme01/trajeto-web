import { normalizeCatalogText } from "./catalogSearch";
import { stationCoordinatePoint } from "./stationListControls";

type StationFacetSource = {
  local?: {
    neighborhood?: string | null;
    brand?: string | null;
    mapData?: { observedBrand?: string | null } | null;
    address?: string | null;
    dataQuality?: string | null;
    dataOrigin?: string | null;
    anp?: { latitude?: number | null; longitude?: number | null } | null;
  } | null;
  anp?: {
    bairro?: string | null;
    distribuidora?: string | null;
    endereco?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

export type StationDirectoryFacet = {
  neighborhood: string;
  brand: string;
  hasAddress: boolean;
  hasAnp: boolean;
  hasCoordinates: boolean;
};

export type StationDirectoryFacetFilters = {
  neighborhood: string;
  brand: string;
  addressOnly: boolean;
  anpOnly: boolean;
  coordinatesOnly: boolean;
};

export function matchesStationDirectoryFacet(
  facet: StationDirectoryFacet,
  filters: StationDirectoryFacetFilters,
) {
  return (filters.neighborhood === "all" || facet.neighborhood === filters.neighborhood) &&
    (filters.brand === "all" || facet.brand === filters.brand) &&
    (!filters.addressOnly || facet.hasAddress) &&
    (!filters.anpOnly || facet.hasAnp) &&
    (!filters.coordinatesOnly || facet.hasCoordinates);
}

/** Build stable options and metadata once per station snapshot, not per search keystroke. */
export function buildStationDirectoryFacets<T extends StationFacetSource>(cards: readonly T[]) {
  const byCard = new Map<T, StationDirectoryFacet>();
  const neighborhoodLabels = new Map<string, string>();
  const brandLabels = new Map<string, string>();
  // ANP records often repeat the same neighborhood or distributor.
  // Cache only within this immutable directory snapshot, so refreshed
  // official data always starts with fresh labels.
  const normalizedLabels = new Map<string, string>();
  const normalizeLabel = (label: string) => {
    const cached = normalizedLabels.get(label);
    if (cached !== undefined) return cached;
    const normalized = normalizeCatalogText(label);
    normalizedLabels.set(label, normalized);
    return normalized;
  };
  for (const card of cards) {
    // Facets use the same ANP-first value shown in each directory card.
    // Local values remain the fallback for entries without ANP details.
    const neighborhoodLabel = (card.anp?.bairro || card.local?.neighborhood || "").trim();
    const brandLabel = (card.anp?.distribuidora || card.local?.brand || card.local?.mapData?.observedBrand || "Bandeira não consolidada").trim();
    const neighborhood = normalizeLabel(neighborhoodLabel);
    const brand = normalizeLabel(brandLabel);
    if (neighborhood && !neighborhoodLabels.has(neighborhood)) neighborhoodLabels.set(neighborhood, neighborhoodLabel);
    if (brand && !brandLabels.has(brand)) brandLabels.set(brand, brandLabel);
    const point = stationCoordinatePoint(
      card.anp?.latitude ?? card.local?.anp?.latitude,
      card.anp?.longitude ?? card.local?.anp?.longitude,
    );
    byCard.set(card, {
      neighborhood,
      brand,
      hasAddress: Boolean((card.anp?.endereco || card.local?.address)?.trim()),
      hasAnp: Boolean(card.anp || card.local?.dataQuality === "anp-confirmed" || card.local?.dataOrigin === "ANP"),
      hasCoordinates: Boolean(point),
    });
  }
  const options = (labels: Map<string, string>) =>
    [...labels].map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  return { byCard, neighborhoods: options(neighborhoodLabels), brands: options(brandLabels) };
}
