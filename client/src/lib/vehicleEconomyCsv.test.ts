import { describe, expect, it } from "vitest";
import { buildVehicleEconomyCsv } from "./vehicleEconomyCsv";

describe("vehicle economy csv", () => {
  it("exporta custos e cenário econômico sem ocultar a data", () => {
    const csv = buildVehicleEconomyCsv([{ vehicleNickname: "Carro", createdAt: "2026-08-19T10:00:00.000Z", distanceKm: 90, gasolineCost: 60, ethanolCost: 55, estimatedSavings: 5, bestFuel: "ethanol", estimatedTripCost: 55 }], "Carro", new Date("2026-08-19T15:00:00.000Z"));
    expect(csv).toContain('"Economia potencial"');
    expect(csv).toContain('"Etanol"');
    expect(csv).toContain('"R$ 5,00"');
  });
});
