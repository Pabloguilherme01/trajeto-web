import { csvCell } from "./csvSerialization";
export type PaginationAlertHistoryCsvRow = { region: string; previousThreshold: number | null; threshold: number; changedAt: Date | string };



export function buildPaginationAlertHistoryCsv(rows: PaginationAlertHistoryCsvRow[], filters: { startDate: string; endDate: string; region: string }, generatedAt = new Date()) {
  const lines = [
    "sep=;",
    `${csvCell("Histórico de limites regionais")};${csvCell(`Gerado em ${generatedAt.toLocaleString("pt-BR")}`)}`,
    `${csvCell("Período inicial")};${csvCell(filters.startDate || "Todo o histórico")}`,
    `${csvCell("Período final")};${csvCell(filters.endDate || "Hoje")}`,
    `${csvCell("Região")};${csvCell(filters.region || "Todas")}`,
    "",
    ["Região", "Limite anterior", "Novo limite", "Variação", "Alterado em"].map(csvCell).join(";"),
    ...rows.map(row => [row.region, row.previousThreshold == null ? "Configuração inicial" : row.previousThreshold, row.threshold, row.previousThreshold == null ? "" : row.threshold - row.previousThreshold, new Date(row.changedAt).toLocaleString("pt-BR")].map(csvCell).join(";")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export const paginationAlertHistoryCsvFilename = (generatedAt = new Date()) => `trajeto-auditoria-limites-${generatedAt.toISOString().slice(0, 10)}.csv`;
