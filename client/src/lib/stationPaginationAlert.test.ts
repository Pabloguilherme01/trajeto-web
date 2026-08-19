import { describe, expect, it } from "vitest";
import { regionsAboveStationPaginationAlert, stationPaginationAlertThreshold, thresholdForStationPaginationRegion } from "./stationPaginationAlert";

describe("station pagination alert", () => {
  it("destaca somente regiões que atingem o limiar operacional", () => {
    expect(regionsAboveStationPaginationAlert([
      { region: "Águas Lindas de Goiás, GO", total: stationPaginationAlertThreshold },
      { region: "Brasília, DF", total: 2 },
    ])).toEqual([{ region: "Águas Lindas de Goiás, GO", total: stationPaginationAlertThreshold }]);
  });

  it("aplica limites específicos por região e preserva o padrão onde não há configuração", () => {
    const thresholds = [{ region: "Águas Lindas de Goiás, GO", threshold: 5 }];
    expect(thresholdForStationPaginationRegion("Brasília, DF", thresholds)).toBe(stationPaginationAlertThreshold);
    expect(regionsAboveStationPaginationAlert([{ region: "Águas Lindas de Goiás, GO", total: 4 }, { region: "Brasília, DF", total: 3 }], thresholds)).toEqual([{ region: "Brasília, DF", total: 3 }]);
  });
});
