export type WeeklyTrendCsvDay = { key: string; label: string; total: number; savedAlerts: number };

export function buildWeeklyTrendCsv(trend: WeeklyTrendCsvDay[], generatedAt = new Date()) {
  const lines = [
    ["Trajeto — tendência semanal", "gerado em", generatedAt.toISOString()].join(";"),
    ["Fonte", "traffic_notifications e product_events (dados agregados)"].join(";"),
    ["Data", "Dia", "Incidentes acionáveis notificados", "Alertas de corredor salvos"].join(";"),
    ...trend.map(day => [day.key, day.label, day.total, day.savedAlerts].join(";")),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export function weeklyTrendCsvFilename(generatedAt = new Date()) {
  return `trajeto-tendencia-semanal-${generatedAt.toISOString().slice(0, 10)}.csv`;
}
