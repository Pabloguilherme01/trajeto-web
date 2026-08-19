import { describe, expect, it } from "vitest";
import { stationPaginationMetricRegion } from "./stationPaginationMetrics";

describe("stationPaginationMetricRegion", () => {
  it("converte consultas do corredor em grupos públicos e não persiste o texto informado", () => {
    expect(stationPaginationMetricRegion("Águas Lindas de Goiás, GO")).toBe("Águas Lindas de Goiás, GO");
    expect(stationPaginationMetricRegion("Posto de exemplo na minha rua")).toBe("Outras consultas");
  });
});
