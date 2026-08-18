export type DailyAggregate = { day: string | Date; total: number };

function dayKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

export function buildWeeklyTrend(rows: DailyAggregate[], periodEnd = new Date()) {
  const totals = new Map(rows.map(row => [typeof row.day === "string" ? row.day.slice(0, 10) : dayKey(row.day), Number(row.total)]));
  const end = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), periodEnd.getUTCDate()));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - 6 + index);
    const key = dayKey(date);
    return { key, label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), total: totals.get(key) ?? 0 };
  });
}

export function aggregateDailyTimestamps(values: Date[]) {
  const totals = new Map<string, number>();
  values.forEach(value => {
    const key = dayKey(value);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  });
  return Array.from(totals, ([day, total]) => ({ day, total }));
}
