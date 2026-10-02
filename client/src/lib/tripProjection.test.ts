import { describe, expect, it } from "vitest";
import { calculateFuelStatus, fuelLitersFromTankFraction, projectTripCosts } from "./tripProjection";

describe("projectTripCosts", () => {
  it("calcula ida e volta e projeção semanal e mensal", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 50,
      oneWayCost: 25,
      roundTrip: true,
      tripsPerWeek: 5,
    });

    expect(result.distanceKm).toBe(100);
    expect(result.fuelCostPerTrip).toBe(50);
    expect(result.extraCostPerTrip).toBe(0);
    expect(result.costPerTrip).toBe(50);
    expect(result.costPerKm).toBe(0.5);
    expect(result.weeklyCost).toBe(250);
    expect(result.monthlyCost).toBeCloseTo(1082.5);
    expect(result.annualCost).toBeCloseTo(12990);
  });

  it("inclui custos extras por viagem", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 40,
      oneWayCost: 20,
      roundTrip: true,
      tripsPerWeek: 3,
      extraCostPerTrip: 12.5,
    });

    expect(result.distanceKm).toBe(80);
    expect(result.fuelCostPerTrip).toBe(40);
    expect(result.extraCostPerTrip).toBe(12.5);
    expect(result.costPerTrip).toBe(52.5);
    expect(result.costPerKm).toBeCloseTo(0.65625);
    expect(result.weeklyCost).toBe(157.5);
    expect(result.monthlyCost).toBeCloseTo(681.975);
  });

  it("limita frequência inválida sem produzir valores negativos", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: -10,
      oneWayCost: -5,
      roundTrip: false,
      tripsPerWeek: 99,
      extraCostPerTrip: -10,
    });

    expect(result.distanceKm).toBe(0);
    expect(result.costPerTrip).toBe(0);
    expect(result.costPerKm).toBe(0);
    expect(result.weeklyCost).toBe(0);
    expect(result.monthlyCost).toBe(0);
  });

  it("não cria projeção semanal ou mensal para viagem pontual", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 30,
      oneWayCost: 18,
      roundTrip: false,
      tripsPerWeek: 7,
      recurring: false,
    });

    expect(result.costPerTrip).toBe(18);
    expect(result.recurring).toBe(false);
    expect(result.weeklyCost).toBe(0);
    expect(result.monthlyCost).toBe(0);
    expect(result.annualCost).toBe(0);
  });

  it("separa abastecimento de saída de reabastecimento no caminho", () => {
    const result = calculateFuelStatus({
      tankLiters: 40,
      currentFuelLiters: 10,
      pricePerLiter: 6,
      kmPerLiter: 10,
      tripDistanceKm: 900,
    });

    expect(result?.tripFitsOneTank).toBe(false);
    expect(result?.maxRangeKm).toBe(400);
    expect(result?.fuelNeededBeforeDeparture).toBe(30);
    expect(result?.departureFuelCost).toBe(180);
    expect(result?.additionalFuelDuringTripLiters).toBe(50);
    expect(result?.minimumRefuelStops).toBe(2);
    expect(result?.minimumFuelCost).toBe(480);
  });

  it("mantém abastecimento mínimo antes de sair quando a viagem cabe em um tanque", () => {
    const result = calculateFuelStatus({
      tankLiters: 40,
      currentFuelLiters: 5,
      pricePerLiter: 6,
      kmPerLiter: 10,
      tripDistanceKm: 200,
    });

    expect(result?.tripFitsOneTank).toBe(true);
    expect(result?.fuelNeededBeforeDeparture).toBe(15);
    expect(result?.departureFuelCost).toBe(90);
    expect(result?.additionalFuelDuringTripLiters).toBe(0);
    expect(result?.minimumRefuelStops).toBe(0);
  });

  it("converte atalhos do marcador de tanque sem ultrapassar a capacidade", () => {
    expect(fuelLitersFromTankFraction(40, 0.25)).toBe(10);
    expect(fuelLitersFromTankFraction(40, 0.5)).toBe(20);
    expect(fuelLitersFromTankFraction(40, 1)).toBe(40);
    expect(fuelLitersFromTankFraction(40, 1.5)).toBe(40);
    expect(fuelLitersFromTankFraction(40, -1)).toBe(0);
  });
});
