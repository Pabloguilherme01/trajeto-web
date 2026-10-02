import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import LocalRouteCalculator from "./LocalRouteCalculator";
import { describe, expect, it } from "vitest";
import { calculateFuelStatus, compareMonthlyBudget, compareTripScenarios, projectTripCosts } from "@/lib/tripProjection";

describe("local route calculator contract", () => {
  it("projects a round trip without negative values", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 35,
      oneWayCost: (35 / 10) * 5.89,
      roundTrip: true,
      tripsPerWeek: 5,
    });

    expect(result.distanceKm).toBe(70);
    expect(result.costPerTrip).toBeCloseTo(41.23, 1);
    expect(result.costPerKm).toBeCloseTo(0.589, 3);
    expect(result.weeklyCost).toBeCloseTo(206.15, 1);
    expect(result.monthlyCost).toBeGreaterThan(result.weeklyCost);
    expect(result.annualCost).toBeGreaterThan(result.monthlyCost);
  });

  it("inclui pedágio e estacionamento no custo total", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 35,
      oneWayCost: (35 / 10) * 5.89,
      roundTrip: true,
      tripsPerWeek: 5,
      extraCostPerTrip: 18,
    });

    expect(result.fuelCostPerTrip).toBeCloseTo(41.23, 1);
    expect(result.extraCostPerTrip).toBe(18);
    expect(result.costPerTrip).toBeCloseTo(59.23, 1);
    expect(result.weeklyCost).toBeCloseTo(296.15, 1);
  });

  it("compara a projeção com o orçamento mensal", () => {
    const within = compareMonthlyBudget(700, 800);
    expect(within?.withinBudget).toBe(true);
    expect(within?.difference).toBe(100);
    expect(within?.usedPercent).toBeCloseTo(87.5, 5);

    const over = compareMonthlyBudget(950, 800);
    expect(over?.withinBudget).toBe(false);
    expect(over?.difference).toBe(-150);
  });

  it("ignora orçamento ausente ou inválido", () => {
    expect(compareMonthlyBudget(700, 0)).toBeNull();
    expect(compareMonthlyBudget(-20, 800)?.monthlyCost).toBe(0);
  });

  it("clamps an invalid weekly frequency", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 35,
      oneWayCost: 20,
      roundTrip: false,
      tripsPerWeek: 99,
    });

    expect(result.weeklyCost).toBe(420);
  });

  it("keeps a zero-frequency projection at zero", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 20,
      oneWayCost: 12,
      roundTrip: true,
      tripsPerWeek: 0,
    });

    expect(result.weeklyCost).toBe(0);
    expect(result.monthlyCost).toBe(0);
    expect(result.annualCost).toBe(0);
  });

  it("calcula abastecimento, autonomia atual e combustível após a viagem", () => {
    const result = calculateFuelStatus({
      tankLiters: 50,
      currentFuelLiters: 20,
      pricePerLiter: 5.89,
      kmPerLiter: 10,
      tripDistanceKm: 120,
    });

    expect(result).not.toBeNull();
    expect(result?.fuelNeededToFill).toBe(30);
    expect(result?.fillCost).toBeCloseTo(176.7, 2);
    expect(result?.currentRangeKm).toBe(200);
    expect(result?.tripFuelNeeded).toBe(12);
    expect(result?.fuelShortfallLiters).toBe(0);
    expect(result?.minimumFuelCost).toBe(0);
    expect(result?.fuelRemainingAfterTrip).toBe(8);
    expect(result?.rangeRemainingAfterTripKm).toBe(80);
    expect(result?.canCompleteTrip).toBe(true);
  });

  it("informa quanto falta abastecer para concluir a viagem", () => {
    const result = calculateFuelStatus({
      tankLiters: 50,
      currentFuelLiters: 5,
      pricePerLiter: 5.89,
      kmPerLiter: 10,
      tripDistanceKm: 80,
    });

    expect(result?.canCompleteTrip).toBe(false);
    expect(result?.fuelRemainingAfterTrip).toBe(-3);
    expect(result?.fuelShortfallLiters).toBe(3);
    expect(result?.minimumFuelCost).toBeCloseTo(17.67, 2);
    expect(result?.rangeRemainingAfterTripKm).toBe(0);
  });

  it("aceita tanque vazio como valor válido de combustível atual", () => {
    const result = calculateFuelStatus({
      tankLiters: 40,
      currentFuelLiters: 0,
      pricePerLiter: 5.5,
      kmPerLiter: 10,
      tripDistanceKm: 20,
    });

    expect(result?.fuelShortfallLiters).toBe(2);
    expect(result?.minimumFuelCost).toBe(11);
    expect(result?.canCompleteTrip).toBe(false);
  });

  it("limita o combustível atual ao tanque e rejeita dados incompletos", () => {
    const result = calculateFuelStatus({
      tankLiters: 40,
      currentFuelLiters: 55,
      pricePerLiter: 5.5,
      kmPerLiter: 12,
      tripDistanceKm: 24,
    });

    expect(result?.currentFuelLiters).toBe(40);
    expect(calculateFuelStatus({
      tankLiters: 40,
      currentFuelLiters: 10,
      pricePerLiter: 0,
      kmPerLiter: 12,
      tripDistanceKm: 24,
    })).toBeNull();
  });

  it("compara dois cenários usando o mesmo percurso e extras", () => {
    const result = compareTripScenarios({
      oneWayDistanceKm: 35,
      baselinePricePerLiter: 5.89,
      baselineKmPerLiter: 10,
      alternativePricePerLiter: 5.49,
      alternativeKmPerLiter: 8.5,
      roundTrip: true,
      tripsPerWeek: 5,
      extraCostPerTrip: 18,
    });

    expect(result).not.toBeNull();
    expect(result?.baseline.costPerTrip).toBeCloseTo(59.23, 1);
    expect(result?.alternative.costPerTrip).toBeCloseTo(63.22, 1);
    expect(result?.differencePerTrip).toBeCloseTo(-3.99, 1);
    expect(result?.differencePerMonth).toBeCloseTo(-86.2, 1);
  });

  it("não compara cenário incompleto", () => {
    expect(compareTripScenarios({
      oneWayDistanceKm: 35,
      baselinePricePerLiter: 5.89,
      baselineKmPerLiter: 10,
      alternativePricePerLiter: 0,
      alternativeKmPerLiter: 8.5,
      roundTrip: true,
      tripsPerWeek: 5,
    })).toBeNull();
  });
});

it("shows automatic route distances to metre precision without floating point tails", () => {
  localStorage.clear();
  const { rerender } = render(<LocalRouteCalculator initialDistanceKm={1519.3 / 1000} />);
  expect((screen.getByLabelText(/distância de ida/i) as HTMLInputElement).value).toBe("1.519");
  rerender(<LocalRouteCalculator initialDistanceKm={2378.7 / 1000} />);
  expect((screen.getByLabelText(/distância de ida/i) as HTMLInputElement).value).toBe("2.379");
  cleanup();
  localStorage.clear();
});
