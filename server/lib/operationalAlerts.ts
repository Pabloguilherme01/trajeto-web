export const googlePaginationAlertType = "google_page_token_threshold";
export const operationalAlertWindowMs = 24 * 60 * 60 * 1000;
export const operationalAlertNotificationCooldownMs = 6 * 60 * 60 * 1000;

export type RegionalTokenEvent = { region: string | null; createdAt: Date };
export type RegionalThreshold = { region: string; threshold: number };

export function evaluateRegionalPaginationAlerts(events: RegionalTokenEvent[], thresholds: RegionalThreshold[], knownRegions: string[] = [], now = new Date()) {
  const since = new Date(now.getTime() - operationalAlertWindowMs);
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.region || event.createdAt < since) continue;
    counts.set(event.region, (counts.get(event.region) ?? 0) + 1);
  }
  const thresholdByRegion = new Map(thresholds.map(item => [item.region, item.threshold]));
  const regions = new Set([...Array.from(counts.keys()), ...Array.from(thresholdByRegion.keys()), ...knownRegions]);
  return Array.from(regions).sort((a, b) => a.localeCompare(b, "pt-BR")).map(region => {
    const threshold = thresholdByRegion.get(region) ?? 3;
    const observedCount = counts.get(region) ?? 0;
    return { region, threshold, observedCount, critical: observedCount >= threshold };
  });
}

export function shouldNotifyOperationalAlert(lastNotifiedAt: Date | null, now = new Date()) {
  return !lastNotifiedAt || now.getTime() - lastNotifiedAt.getTime() >= operationalAlertNotificationCooldownMs;
}
