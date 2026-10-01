import { describe, expect, it } from "vitest";
import { getTripCalculatorMode, TRIP_CALCULATOR_MODES } from "@/lib/tripCalculatorModes";

describe("trip calculator modes", () => {
  it("mantém um modo automático sem inventar frequência", () => {
    const mode = getTripCalculatorMode("automatico");
    expect(mode.roundTrip).toBeUndefined();
    expect(mode.tripsPerWeek).toBeUndefined();
  });

  it("oferece modos prontos para os padrões de uso mais comuns", () => {
    expect(getTripCalculatorMode("agora")).toMatchObject({ roundTrip: false, tripsPerWeek: 1 });
    expect(getTripCalculatorMode("trabalho")).toMatchObject({ roundTrip: true, tripsPerWeek: 5 });
    expect(getTripCalculatorMode("rotina")).toMatchObject({ roundTrip: true, tripsPerWeek: 2 });
    expect(getTripCalculatorMode("todo-dia")).toMatchObject({ roundTrip: true, tripsPerWeek: 7 });
    expect(TRIP_CALCULATOR_MODES).toHaveLength(5);
  });
});
