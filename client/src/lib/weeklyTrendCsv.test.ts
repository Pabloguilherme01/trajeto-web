import { describe, expect, it } from "vitest";
import { buildWeeklyTrendCsv, weeklyTrendCsvFilename } from "./weeklyTrendCsv";

describe("weekly trend CSV", () => {
  it("includes the source, headers, daily aggregates, UTF-8 BOM and predictable filename", () => {
    const generatedAt = new Date("2026-08-18T12:00:00.000Z");
    const csv = buildWeeklyTrendCsv([{ key: "2026-08-18", label: "seg", total: 2, savedAlerts: 1 }], generatedAt);
    expect(csv).toContain("\uFEFFTrajeto — tendência semanal;gerado em;2026-08-18T12:00:00.000Z");
    expect(csv).toContain("Fonte;traffic_notifications e product_events (dados agregados)");
    expect(csv).toContain("Data;Dia;Incidentes acionáveis notificados;Alertas de corredor salvos");
    expect(csv).toContain("2026-08-18;seg;2;1");
    expect(weeklyTrendCsvFilename(generatedAt)).toBe("trajeto-tendencia-semanal-2026-08-18.csv");
  });
});
