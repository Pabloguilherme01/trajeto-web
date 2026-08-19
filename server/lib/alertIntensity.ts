export type AlertIntensityHour = { hour: number; label: string; total: number };

export function buildAlertIntensityByHour(timestamps: Date[]) {
  const totals = Array.from({ length: 24 }, () => 0);
  const hourFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false });
  for (const timestamp of timestamps) {
    const hour = Number(hourFormatter.format(timestamp));
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) totals[hour] += 1;
  }
  return totals.map((total, hour) => ({ hour, label: `${String(hour).padStart(2, "0")}h`, total } satisfies AlertIntensityHour));
}
