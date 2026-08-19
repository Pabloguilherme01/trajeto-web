import { describe, expect, it } from "vitest";
import { toVehicleEconomyHistory } from "./vehicleEconomyHistory";

describe("vehicle economy history", () => {
  it("calcula o combustível de menor custo e a economia potencial sem inventar cenários incompletos", () => {
    const history = toVehicleEconomyHistory([
      { vehicleId: 7, vehicleNickname: "Meu carro", createdAt: new Date("2026-08-19T10:00:00Z"), distanceMeters: 100_000, gasolinePrice: "6", ethanolPrice: "4", gasolineKmPerLiter: "10", ethanolKmPerLiter: "7", estimatedTripCost: "57.14" },
      { vehicleId: 8, vehicleNickname: "Incompleto", createdAt: new Date(), distanceMeters: 10_000, gasolinePrice: null, ethanolPrice: "4", gasolineKmPerLiter: "10", ethanolKmPerLiter: "7", estimatedTripCost: null },
    ]);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ vehicleId: 7, bestFuel: "ethanol", estimatedSavings: expect.closeTo(2.857, 2) });
  });
});
