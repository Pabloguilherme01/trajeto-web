import { describe, expect, it } from "vitest";
import {
  ALL_LOCAL_ROUTE_DESTINATIONS,
  getLocalRoutePresets,
  LOCAL_ROUTE_PRESETS,
} from "./localRoutePresets";

describe("local route presets", () => {
  it("provides a broad set of reusable city destinations", () => {
    expect(LOCAL_ROUTE_PRESETS.length).toBeGreaterThanOrEqual(20);
    expect(ALL_LOCAL_ROUTE_DESTINATIONS.length).toBeGreaterThanOrEqual(80);
    expect(
      getLocalRoutePresets("Cadastro Único").some(
        item => item.id === "cadunico"
      )
    ).toBe(true);
    expect(
      getLocalRoutePresets("CRAS II Santa Lucia").some(
        item => item.id === "cras-2"
      )
    ).toBe(true);
    expect(
      new Set(ALL_LOCAL_ROUTE_DESTINATIONS.map(item => item.id)).size
    ).toBe(ALL_LOCAL_ROUTE_DESTINATIONS.length);
    expect(
      getLocalRoutePresets("Giraffas").some(
        item => item.id === "place-giraffas-shopping"
      )
    ).toBe(true);
    expect(getLocalRoutePresets("HEAL").some(item => item.id === "heal")).toBe(
      true
    );
    expect(
      getLocalRoutePresets("delegacia").some(
        item => item.id === "policia-civil"
      )
    ).toBe(true);
    expect(
      getLocalRoutePresets("UBS").some(item => item.id === "ubs-barragem-ii")
    ).toBe(true);
  });
});
