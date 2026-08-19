export const stationPaginationAlertThreshold = 3;

export type StationPaginationRegionMetric = { region: string; total: number };
export type StationPaginationThreshold = { region: string; threshold: number };

export function thresholdForStationPaginationRegion(region: string, thresholds: StationPaginationThreshold[] = []) {
  return thresholds.find(item => item.region === region)?.threshold ?? stationPaginationAlertThreshold;
}

export function regionsAboveStationPaginationAlert(metrics: StationPaginationRegionMetric[], thresholds: StationPaginationThreshold[] = []) {
  return metrics.filter(metric => metric.total >= thresholdForStationPaginationRegion(metric.region, thresholds));
}
