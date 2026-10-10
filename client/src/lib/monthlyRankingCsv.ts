import { csvCell } from "./csvSerialization";
export type MonthlyRankingCsvRow = { position: number; corridorLabel: string; alerts: number; unread: number; previousPosition: number | null; positionChange: number | null };

export function monthlyRankingCsv(month: string, rows: MonthlyRankingCsvRow[]) { return `\uFEFF${["mês", "posição", "corredor", "alertas", "não_lidos", "posição_anterior", "variação"].join(";")}\n${rows.map(row => [month, row.position, row.corridorLabel, row.alerts, row.unread, row.previousPosition ?? "entrada", row.positionChange == null ? "entrada" : row.positionChange].map(csvCell).join(";")).join("\n")}`; }
