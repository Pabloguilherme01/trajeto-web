import { describe, expect, it } from "vitest";
import { regionsAboveStationPaginationAlert, stationPaginationAlertThreshold } from "./stationPaginationAlert";

describe("station pagination alert", () => {
  it("destaca somente regiões que atingem o limiar operacional", () => {
    expect(regionsAboveStationPaginationAlert([
      { region: "Águas Lindas de Goiás, GO", total: stationPaginationAlertThreshold },
      { region: "Brasília, DF", total: 2 },
    ])).toEqual([{ region: "Águas Lindas de Goiás, GO", total: stationPaginationAlertThreshold }]);
  });
});
