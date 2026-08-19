import { buildWeeklyTrend } from "./weeklyTrends";

export type GoogleMapsMetricSample = { createdAt: Date; success: boolean; durationMs: number };
export type GoogleMapsTokenWait = { createdAt: Date };

export function buildGoogleMapsWeeklyStability(metrics: GoogleMapsMetricSample[], tokenWaits: GoogleMapsTokenWait[], periodEnd = new Date()) {
  const metricsByDay = new Map<string, GoogleMapsMetricSample[]>();
  const tokenWaitsByDay = new Map<string, number>();
  for (const sample of metrics) {
    const key = sample.createdAt.toISOString().slice(0, 10);
    metricsByDay.set(key, [...(metricsByDay.get(key) ?? []), sample]);
  }
  for (const wait of tokenWaits) {
    const key = wait.createdAt.toISOString().slice(0, 10);
    tokenWaitsByDay.set(key, (tokenWaitsByDay.get(key) ?? 0) + 1);
  }
  const totals = Array.from(metricsByDay.entries()).map(([day, samples]) => ({ day, total: samples.length }));
  return buildWeeklyTrend(totals, periodEnd).map(day => {
    const samples = metricsByDay.get(day.key) ?? [];
    const durations = samples.map(sample => sample.durationMs).sort((a, b) => a - b);
    const successRate = samples.length ? Math.round((samples.filter(sample => sample.success).length / samples.length) * 100) : null;
    const p95Ms = durations.length ? durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1)] : null;
    return { ...day, samples: samples.length, successRate, p95Ms, tokensWaiting: tokenWaitsByDay.get(day.key) ?? 0 };
  });
}
