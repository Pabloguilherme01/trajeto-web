import { describe, expect, it } from "vitest";
import { calculateFuelEconomy, compareFuelPrices } from "./fuelEconomy";

describe("calculateFuelEconomy", () => {
  it("calcula consumo, custo e autonomia somente a partir de parâmetros declarados", () => {
    expect(calculateFuelEconomy({ distanceKm: 300, pricePerLiter: 5.8, kmPerLiter: 12, tankLiters: 45 })).toEqual({ distanceKm: 300, litersNeeded: 25, tripCost: 145, roundTripCost: 290, costPerKm: 0.483, autonomyKm: 540, refuelsNeeded: 0 });
  });

  it("recusa insumos que poderiam produzir uma estimativa enganosa", () => {
    expect(() => calculateFuelEconomy({ distanceKm: 20, pricePerLiter: 0, kmPerLiter: 10 })).toThrow("preço por litro");
  });

  it("compara gasolina e etanol pela relação entre preço e consumo, sem usar regra fixa", () => {
    const result = compareFuelPrices({ distanceKm: 100, gasolinePrice: 6, ethanolPrice: 3.8, gasolineKmPerLiter: 12, ethanolKmPerLiter: 8, tankLiters: 45 });
    expect(result).toMatchObject({ recommendedFuel: "ethanol", savings: 2.5, breakEvenEthanolPrice: 4, gasoline: { tripCost: 50 }, ethanol: { tripCost: 47.5 } });
  });
});
