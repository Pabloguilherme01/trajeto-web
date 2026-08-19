import { describe, expect, it } from "vitest";
import { buildPaginationAlertHistoryCsv } from "./paginationAlertHistoryCsv";

describe("pagination alert history csv", () => {
  it("inclui filtros, variação e valores com escape seguro", () => {
    const csv = buildPaginationAlertHistoryCsv([{ region: 'Águas "Lindas"', previousThreshold: 3, threshold: 5, changedAt: "2026-08-19T12:00:00.000Z" }], { startDate: "2026-08-01", endDate: "2026-08-19", region: "Águas Lindas" }, new Date("2026-08-19T15:00:00.000Z"));
    expect(csv).toContain('"Região";"Limite anterior";"Novo limite";"Variação";"Alterado em"');
    expect(csv).toContain('"Águas ""Lindas""";"3";"5";"2"');
    expect(csv).toContain('"Período inicial";"2026-08-01"');
  });
});
