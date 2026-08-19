export type GoogleMapsStabilityCsvDay = { key: string; label: string; samples: number; successRate: number | null; p95Ms: number | null; tokensWaiting: number };

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export function buildGoogleMapsStabilityCsv(trend: GoogleMapsStabilityCsvDay[], generatedAt = new Date()) {
  const lines = [
    "sep=;",
    `${csvCell("Resumo semanal Google Maps")};${csvCell(`Gerado em ${generatedAt.toLocaleString("pt-BR")}`)}`,
    "",
    ["Data", "Dia", "Amostras", "Taxa de sucesso", "p95 (ms)", "Tokens em espera"].map(csvCell).join(";"),
    ...trend.map(day => [day.key, day.label, day.samples, day.successRate == null ? "" : `${day.successRate}%`, day.p95Ms ?? "", day.tokensWaiting].map(csvCell).join(";")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function googleMapsStabilityCsvFilename(generatedAt = new Date()) {
  return `trajeto-estabilidade-google-maps-${generatedAt.toISOString().slice(0, 10)}.csv`;
}
