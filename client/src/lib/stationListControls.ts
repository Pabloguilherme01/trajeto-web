export type StationListItem = { name: string; isOpen: boolean | null; distanceMeters: number | null };
export type StationHoursFilter = "all" | "open" | "closed" | "unknown";
export type StationSort = "distance" | "relevance" | "brand" | "hours" | "best-value";

export function inferredBrand(name: string) {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("shell")) return "Shell";
  if (normalized.includes("ipiranga")) return "Ipiranga";
  if (normalized.includes("petrobras")) return "Petrobras";
  if (/\bale\b/.test(normalized)) return "ALE";
  return "Outras / não declarada";
}

export function filterAndSortStations<T extends StationListItem>(stations: T[], brandFilter: string, hoursFilter: StationHoursFilter, sortBy: StationSort) {
  return stations
    .filter(station => (brandFilter === "all" || inferredBrand(station.name) === brandFilter) && (hoursFilter === "all" || (hoursFilter === "open" && station.isOpen === true) || (hoursFilter === "closed" && station.isOpen === false) || (hoursFilter === "unknown" && station.isOpen === null)))
    .map((station, index) => ({ station, index }))
    .sort((a, b) => {
      if (sortBy === "relevance") return a.index - b.index;
      if (sortBy === "brand") return inferredBrand(a.station.name).localeCompare(inferredBrand(b.station.name), "pt-BR") || a.station.name.localeCompare(b.station.name, "pt-BR");
      if (sortBy === "hours") return Number(b.station.isOpen === true) - Number(a.station.isOpen === true) || Number(a.station.isOpen === false) - Number(b.station.isOpen === false) || a.station.name.localeCompare(b.station.name, "pt-BR");
      return (a.station.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.station.distanceMeters ?? Number.MAX_SAFE_INTEGER);
    })
    .map(({ station }) => station);
}


export type StationSearchPreferenceValues = {
  mappedBrand: string;
  hoursStatus: StationHoursFilter;
  sortBy: StationSort;
  resultsPerView: 5 | 10 | 20;
  economicMode: boolean;
};

export function applyStationSearchPreferences(preferences: StationSearchPreferenceValues) {
  const resultsPerView = preferences.economicMode ? 5 : preferences.resultsPerView;
  return {
    brandFilter: preferences.mappedBrand,
    hoursFilter: preferences.hoursStatus,
    sortBy: preferences.sortBy,
    resultsPerView,
    visibleResultCount: resultsPerView,
  };
}


export type StationDecisionInput = {
  distanceKm: number | null;
  price: number | null;
  isOpen: boolean | null;
  hasAnp: boolean;
};

export type StationDecisionBaseline = {
  minDistanceKm: number | null;
  minPrice: number | null;
};

function finitePositive(value: number | null) {
  return value != null && Number.isFinite(value) && value > 0;
}

export function stationDecisionScore(item: StationDecisionInput, baseline: StationDecisionBaseline) {
  const minPrice = finitePositive(baseline.minPrice) ? baseline.minPrice as number : 1;
  const minDistance = finitePositive(baseline.minDistanceKm) ? baseline.minDistanceKm as number : 1;

  const pricePart = finitePositive(item.price) ? ((item.price as number) / minPrice) * 0.58 : 1.35;
  const distancePart = finitePositive(item.distanceKm) ? ((item.distanceKm as number) / minDistance) * 0.32 : 1.15;
  const openPart = item.isOpen === true ? -0.12 : item.isOpen === false ? 0.12 : 0.04;
  const anpPart = item.hasAnp ? -0.03 : 0.03;
  return pricePart + distancePart + openPart + anpPart;
}

export function compareBestValue(a: StationDecisionInput, b: StationDecisionInput, baseline: StationDecisionBaseline) {
  return stationDecisionScore(a, baseline) - stationDecisionScore(b, baseline);
}

export function stationSortLabel(sortBy: StationSort) {
  return {
    distance: "Mais perto",
    relevance: "Relevância",
    brand: "Bandeira",
    hours: "Funcionamento",
    "best-value": "Melhor combinação",
  }[sortBy];
}
