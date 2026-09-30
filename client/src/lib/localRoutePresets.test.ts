import { describe, expect, it } from "vitest";
import { getLocalRoutePresets, LOCAL_ROUTE_PRESETS } from "./localRoutePresets";

describe("local route presets", () => {
  it("provides a broad set of reusable city destinations", () => {
    expect(LOCAL_ROUTE_PRESETS.length).toBeGreaterThanOrEqual(20);
    expect(getLocalRoutePresets("HEAL").some(item => item.id === "heal")).toBe(true);
    expect(getLocalRoutePresets("delegacia").some(item => item.id === "policia-civil")).toBe(true);
    expect(getLocalRoutePresets("UBS").some(item => item.id === "ubs-barragem-ii")).toBe(true);
  });
});
