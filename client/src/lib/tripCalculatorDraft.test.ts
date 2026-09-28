import { beforeEach, describe, expect, it } from "vitest";
import { clearTripCalculatorDraft, loadTripCalculatorDraft, saveTripCalculatorDraft } from "@/lib/tripCalculatorDraft";

function installLocalStorageMock() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  });
}

describe("trip calculator draft", () => {
  beforeEach(() => installLocalStorageMock());

  it("persiste e recupera o cenário local", () => {
    saveTripCalculatorDraft({
      distance: "35",
      price: "5,89",
      consumption: "10",
      tank: "45",
      currentFuel: "18",
      roundTrip: true,
      tripsPerWeek: 5,
      toll: "8",
      parking: "10",
      other: "2",
      alternativePrice: "5,49",
      alternativeConsumption: "8,5",
      monthlyBudget: "800",
    });

    expect(loadTripCalculatorDraft()).toMatchObject({ distance: "35", price: "5,89", roundTrip: true, monthlyBudget: "800" });
  });

  it("ignora rascunho ausente ou inválido", () => {
    expect(loadTripCalculatorDraft()).toBeNull();
    localStorage.setItem("trajeto-trip-calculator-draft", "{");
    expect(loadTripCalculatorDraft()).toBeNull();
  });

  it("remove o cenário salvo", () => {
    saveTripCalculatorDraft({ distance: "20" });
    clearTripCalculatorDraft();
    expect(loadTripCalculatorDraft()).toBeNull();
  });
});
