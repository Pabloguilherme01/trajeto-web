export type StationListItem = { name: string; isOpen: boolean | null; distanceMeters: number | null };
export type StationHoursFilter = "all" | "open" | "closed" | "unknown";
export type StationSort = "distance" | "relevance" | "brand" | "hours";

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


export type StationFuelFilter = "all" | "gasolina-comum" | "etanol" | "diesel-s10" | "diesel-s500" | "glp-p13" | "gnv";

export function stationProductMatchesFuel(productName: string, filter: StationFuelFilter) {
  if (filter === "all") return true;
  const text = productName.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (filter === "gasolina-comum") return text.includes("gasolina") && !text.includes("aditivada");
  if (filter === "etanol") return text.includes("etanol");
  if (filter === "diesel-s10") return text.includes("s10");
  if (filter === "diesel-s500") return text.includes("s500");
  if (filter === "glp-p13") return text.includes("glp") || text.includes("p13") || text.includes("13 kg");
  return text.includes("gnv") || text.includes("gas natural");
}

export function stationSupportsFuel(
  priceProductKeys: string[],
  anpProductNames: string[],
  filter: StationFuelFilter,
) {
  if (filter === "all") return true;
  return priceProductKeys.includes(filter) || anpProductNames.some(product => stationProductMatchesFuel(product, filter));
}

export function fuelFilterPriceKey(filter: StationFuelFilter): Exclude<StationFuelFilter, "all"> {
  return filter === "all" ? "gasolina-comum" : filter;
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
