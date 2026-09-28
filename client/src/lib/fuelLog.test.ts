import { beforeEach, describe, expect, it } from "vitest";
import { addFuelLogEntry, listFuelLog, removeFuelLogEntry, summarizeFuelLog } from "./fuelLog";

describe("fuelLog", () => {
  beforeEach(() => localStorage.clear());

  it("registra abastecimento e calcula preço por litro", () => {
    const entry = addFuelLogEntry({ date: "2026-09-20", liters: 40, totalCost: 240, odometerKm: 10000 });
    expect(entry).not.toBeNull();
    expect(listFuelLog()).toHaveLength(1);
    expect(summarizeFuelLog().averagePricePerLiter).toBe(6);
  });

  it("soma gastos e distância informada pelo hodômetro", () => {
    addFuelLogEntry({ date: "2026-09-01", liters: 30, totalCost: 180, odometerKm: 10000 });
    addFuelLogEntry({ date: "2026-09-10", liters: 35, totalCost: 210, odometerKm: 10420 });
    const summary = summarizeFuelLog();
    expect(summary.totalLiters).toBe(65);
    expect(summary.totalCost).toBe(390);
    expect(summary.odometerDistanceKm).toBe(420);
    expect(summary.estimatedCostPerKm).toBeCloseTo(390 / 420);
  });

  it("recusa valores inválidos e permite remover registro", () => {
    expect(addFuelLogEntry({ liters: 0, totalCost: 10 })).toBeNull();
    const entry = addFuelLogEntry({ liters: 10, totalCost: 60 });
    expect(entry).not.toBeNull();
    expect(removeFuelLogEntry(entry!.id)).toBe(true);
    expect(listFuelLog()).toHaveLength(0);
    expect(removeFuelLogEntry("missing")).toBe(false);
  });
});
