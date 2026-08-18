export type StationListItem = { name: string; isOpen: boolean | null; distanceMeters: number | null };
export type StationHoursFilter = "all" | "open" | "closed" | "unknown";
export type StationSort = "distance" | "brand" | "hours";

export function inferredBrand(name: string) {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("shell")) return "Shell";
  if (normalized.includes("ipiranga")) return "Ipiranga";
  if (normalized.includes("petrobras")) return "Petrobras";
  if (/\bale\b/.test(normalized)) return "ALE";
  return "Outras / não declarada";
}

export function filterAndSortStations<T extends StationListItem>(stations: T[], brandFilter: string, hoursFilter: StationHoursFilter, sortBy: StationSort) {
  return stations.filter(station => (brandFilter === "all" || inferredBrand(station.name) === brandFilter) && (hoursFilter === "all" || (hoursFilter === "open" && station.isOpen === true) || (hoursFilter === "closed" && station.isOpen === false) || (hoursFilter === "unknown" && station.isOpen === null))).sort((a, b) => {
    if (sortBy === "brand") return inferredBrand(a.name).localeCompare(inferredBrand(b.name), "pt-BR") || a.name.localeCompare(b.name, "pt-BR");
    if (sortBy === "hours") return Number(b.isOpen === true) - Number(a.isOpen === true) || Number(a.isOpen === false) - Number(b.isOpen === false) || a.name.localeCompare(b.name, "pt-BR");
    return (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER);
  });
}
