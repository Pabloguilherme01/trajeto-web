export const stationResultsPageSizes = [5, 10, 20] as const;
export type StationResultsPageSize = (typeof stationResultsPageSizes)[number];

export function visibleStationResults<T>(stations: T[], visibleCount: number) {
  return stations.slice(0, Math.max(0, visibleCount));
}

export function nextVisibleStationCount(current: number, pageSize: StationResultsPageSize, total: number) {
  return Math.min(total, current + pageSize);
}
