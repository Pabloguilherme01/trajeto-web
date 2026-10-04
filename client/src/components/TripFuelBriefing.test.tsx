import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TripFuelBriefing from "./TripFuelBriefing";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("TripFuelBriefing", () => {
  it("switches instantly between one-way and round-trip estimates", () => {
    localStorage.setItem("trajeto-mobile-vehicle", JSON.stringify({
      name: "Meu carro",
      fuel: "gasolina",
      consumption: 10,
      tank: 50,
    }));
    localStorage.setItem("trajeto-fuel-log", JSON.stringify([
      { id: "1", liters: 20, totalCost: 120, odometerKm: 1000, date: "2026-10-04" }
    ]));

    render(<TripFuelBriefing distanceKm={20} durationSeconds={1800} />);

    expect(screen.getByText("2 L")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ida e volta/i }));
    expect(screen.getByText("4 L")).toBeTruthy();
    expect(screen.getByText(/Calculado para ida e volta/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Só ida/i }));
    expect(screen.getByText("2 L")).toBeTruthy();
  });
});
