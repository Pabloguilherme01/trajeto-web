export type PaginationAlertHistoryCsvRow = { region: string; previousThreshold: number | null; threshold: number; changedAt: Date | string };

const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export function buildPaginationAlertHistoryCsv(rows: PaginationAlertHistoryCsvRow[], filters: { startDate: string; endDate: string; region: string }, generatedAt = new Date()) {
  const lines = [
    "sep=;",
    `${cell("Histórico de limites regionais")};${cell(`Gerado em ${generatedAt.toLocaleString("pt-BR")}`)}`,
    `${cell("Período inicial")};${cell(filters.startDate || "Todo o histórico")}`,
    `${cell("Período final")};${cell(filters.endDate || "Hoje")}`,
    `${cell("Região")};${cell(filters.region || "Todas")}`,
    "",
    ["Região", "Limite anterior", "Novo limite", "Variação", "Alterado em"].map(cell).join(";"),
    ...rows.map(row => [row.region, row.previousThreshold == null ? "Configuração inicial" : row.previousThreshold, row.threshold, row.previousThreshold == null ? "" : row.threshold - row.previousThreshold, new Date(row.changedAt).toLocaleString("pt-BR")].map(cell).join(";")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export const paginationAlertHistoryCsvFilename = (generatedAt = new Date()) => `trajeto-auditoria-limites-${generatedAt.toISOString().slice(0, 10)}.csv`;
