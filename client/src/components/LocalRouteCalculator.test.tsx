import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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


it("clears a previous route distance when the new route distance is invalid", () => {
  localStorage.clear();
  const { rerender } = render(<LocalRouteCalculator initialDistanceKm={12} />);
  rerender(<LocalRouteCalculator initialDistanceKm={Number.NaN} />);
  expect((screen.getByLabelText(/distância de ida/i) as HTMLInputElement).value).toBe("");
  cleanup();
  localStorage.clear();
});


it("starts a newly calculated route as an automatic one-off trip instead of inheriting an old routine", async () => {
  cleanup();
  localStorage.clear();
  localStorage.setItem("trajeto-trip-calculator-draft", JSON.stringify({
    mode: "trabalho",
    recurring: true,
    distance: "18",
    price: "6",
    consumption: "10",
    tank: "40",
    currentFuel: "",
    roundTrip: true,
    tripsPerWeek: 5,
    toll: "",
    parking: "",
    other: "",
    alternativePrice: "",
    alternativeConsumption: "",
    monthlyBudget: "",
  }));

  render(<LocalRouteCalculator initialDistanceKm={12} />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Automático/i }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("sem projeção semanal")).toBeTruthy();
  });

  expect((screen.getByLabelText(/distância de ida/i) as HTMLInputElement).value).toBe("12");
  cleanup();
  localStorage.clear();
});

it("clears the calculator draft and remembered price without recreating an empty draft", async () => {
  cleanup();
  localStorage.clear();
  localStorage.setItem("trajeto-last-fuel-price", "5,99");
  localStorage.setItem("trajeto-trip-calculator-draft", JSON.stringify({
    mode: "automatico",
    recurring: false,
    distance: "20",
    price: "5,99",
    consumption: "10",
    tank: "",
    currentFuel: "",
    roundTrip: false,
    tripsPerWeek: 1,
    toll: "",
    parking: "",
    other: "",
    alternativePrice: "",
    alternativeConsumption: "",
    monthlyBudget: "",
  }));

  render(<LocalRouteCalculator />);
  fireEvent.click(screen.getByRole("button", { name: "Limpar cálculo" }));

  await waitFor(() => {
    expect(localStorage.getItem("trajeto-trip-calculator-draft")).toBeNull();
    expect(localStorage.getItem("trajeto-last-fuel-price")).toBeNull();
  });

  cleanup();
  localStorage.clear();
});


it("completa somente o campo essencial que ficou vazio usando dados locais conhecidos", async () => {
  cleanup();
  localStorage.clear();
  localStorage.setItem("trajeto-last-fuel-price", "5,99");
  localStorage.setItem("trajeto-mobile-vehicle", JSON.stringify({
    name: "Meu carro",
    fuel: "gasolina",
    consumption: 11.2,
    tank: 45,
  }));

  render(<LocalRouteCalculator initialDistanceKm={12} />);

  const priceInput = screen.getByPlaceholderText("5,89") as HTMLInputElement;
  expect(priceInput.value).toBe("5,99");
  fireEvent.change(priceInput, { target: { value: "" } });

  expect(screen.getByText(/Revise 1 dado\(s\): preço/i)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Completar campos automaticamente" }));

  await waitFor(() => {
    expect(priceInput.value).toBe("5,99");
  });
  expect((screen.getByLabelText(/distância de ida/i) as HTMLInputElement).value).toBe("12");
  expect((screen.getByLabelText(/consumo do veículo/i) as HTMLInputElement).value).toBe("11.2");

  cleanup();
  localStorage.clear();
});

it("preserva valores inválidos digitados ao completar outro campo vazio", () => {
  cleanup();
  localStorage.clear();
  localStorage.setItem("trajeto-last-fuel-price", "5,99");
  localStorage.setItem("trajeto-mobile-vehicle", JSON.stringify({ name: "Meu carro", fuel: "gasolina", consumption: 11.2, tank: 45 }));
  render(<LocalRouteCalculator initialDistanceKm={12} />);
  const distance = screen.getByLabelText(/distância de ida/i) as HTMLInputElement;
  const consumption = screen.getByLabelText(/consumo do veículo/i) as HTMLInputElement;
  const price = screen.getByPlaceholderText("5,89") as HTMLInputElement;
  fireEvent.change(distance, { target: { value: "0" } });
  fireEvent.change(consumption, { target: { value: "-2" } });
  fireEvent.change(price, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Completar campos automaticamente" }));
  expect(price.value).toBe("5,99");
  expect(distance.value).toBe("0");
  expect(consumption.value).toBe("-2");
  expect(screen.getByText(/Revise 2 dado/)).toBeTruthy();
  cleanup();
  localStorage.clear();
});
