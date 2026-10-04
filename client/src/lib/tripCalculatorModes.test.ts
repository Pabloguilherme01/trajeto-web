import { describe, expect, it } from "vitest";
import { getTripCalculatorMode, isRecurringTripMode, isTripCalculatorModeSelection, TRIP_CALCULATOR_MODES } from "@/lib/tripCalculatorModes";

describe("trip calculator modes", () => {
  it("mantém um modo automático sem inventar frequência", () => {
    const mode = getTripCalculatorMode("automatico");
    expect(mode.roundTrip).toBeUndefined();
    expect(mode.tripsPerWeek).toBeUndefined();
    expect(mode.recurring).toBe(false);
  });

  it("oferece modos prontos para os padrões de uso mais comuns", () => {
    expect(getTripCalculatorMode("agora")).toMatchObject({ roundTrip: false, tripsPerWeek: 1, recurring: false });
    expect(getTripCalculatorMode("bate-volta")).toMatchObject({ roundTrip: true, tripsPerWeek: 1, recurring: false });
    expect(getTripCalculatorMode("rotina")).toMatchObject({ roundTrip: true, tripsPerWeek: 2, recurring: true });
    expect(getTripCalculatorMode("tres-vezes")).toMatchObject({ roundTrip: true, tripsPerWeek: 3, recurring: true });
    expect(getTripCalculatorMode("trabalho")).toMatchObject({ roundTrip: true, tripsPerWeek: 5, recurring: true });
    expect(getTripCalculatorMode("trabalho-6x")).toMatchObject({ roundTrip: true, tripsPerWeek: 6, recurring: true });
    expect(getTripCalculatorMode("todo-dia")).toMatchObject({ roundTrip: true, tripsPerWeek: 7, recurring: true });
    expect(TRIP_CALCULATOR_MODES).toHaveLength(8);
  });

  it("distingue cenário pontual de rotina personalizada", () => {
    expect(isRecurringTripMode("automatico")).toBe(false);
    expect(isRecurringTripMode("agora")).toBe(false);
    expect(isRecurringTripMode("bate-volta")).toBe(false);
    expect(isRecurringTripMode("trabalho")).toBe(true);
    expect(isRecurringTripMode("personalizado")).toBe(true);
  });

  it("valida o modo restaurado do armazenamento local", () => {
    expect(isTripCalculatorModeSelection("todo-dia")).toBe(true);
    expect(isTripCalculatorModeSelection("personalizado")).toBe(true);
    expect(isTripCalculatorModeSelection("qualquer-coisa")).toBe(false);
  });
});
