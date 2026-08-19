export const stationPaginationAlertThreshold = 3;

export type StationPaginationRegionMetric = { region: string; total: number };

export function regionsAboveStationPaginationAlert(metrics: StationPaginationRegionMetric[], threshold = stationPaginationAlertThreshold) {
  return metrics.filter(metric => metric.total >= threshold);
}
