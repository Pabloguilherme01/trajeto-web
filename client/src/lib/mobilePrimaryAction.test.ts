import { describe, expect, it } from "vitest";
import { chooseMobilePrimaryAction } from "./mobilePrimaryAction";

describe("chooseMobilePrimaryAction", () => {
  it("continues a saved route when offline", () => {
    expect(chooseMobilePrimaryAction({
      online: false, mode: "automatico", automaticMode: "offline", savedRoutes: 2,
    })).toEqual({ kind: "offline", label: "Continuar", target: { routeList: true } });
  });

  it("repeats the last trip in repeat mode", () => {
    expect(chooseMobilePrimaryAction({
      online: true, mode: "repetir", automaticMode: "proxima", savedRoutes: 0,
      lastTrip: { origin: "Casa", destination: "Trabalho" },
    })).toEqual({
      kind: "repeat", label: "Repetir", target: { origin: "Casa", destination: "Trabalho" },
    });
  });

  it("opens the most-used destination in next-trip mode", () => {
    expect(chooseMobilePrimaryAction({
      online: true, mode: "proxima", automaticMode: "proxima", savedRoutes: 0,
      favorite: { label: "Trabalho", value: "Av. Central" },
    })).toEqual({ kind: "destination", label: "Trabalho", target: { destination: "Av. Central" } });
  });

  it("opens the cost calculator in economy mode", () => {
    expect(chooseMobilePrimaryAction({
      online: true, mode: "economia", automaticMode: "proxima", savedRoutes: 0,
    })).toEqual({ kind: "economy", label: "Custo", target: { calculator: true } });
  });

  it("falls back to planning when there is no usable saved context", () => {
    expect(chooseMobilePrimaryAction({
      online: true, mode: "automatico", automaticMode: "proxima", savedRoutes: 0,
    })).toEqual({ kind: "plan", label: "Planejar" });
  });
});
