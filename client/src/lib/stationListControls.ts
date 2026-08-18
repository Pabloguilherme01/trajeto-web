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
