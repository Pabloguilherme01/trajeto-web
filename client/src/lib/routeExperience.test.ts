import { describe, expect, it } from "vitest";
import {
  effectivePlannerMode,
  plannerActionLabel,
  routeFreshness,
  shouldAutoRefreshSavedRoute,
} from "./routeExperience";

describe("route experience", () => {
  const now = Date.parse("2026-10-02T18:00:00.000Z");

  it("classifies saved-route freshness", () => {
    expect(routeFreshness("2026-10-02T16:00:00.000Z", now)).toBe("fresh");
    expect(routeFreshness("2026-10-02T08:00:00.000Z", now)).toBe("aging");
    expect(routeFreshness("2026-09-30T18:00:00.000Z", now)).toBe("stale");
  });

  it("falls network-dependent modes back to offline when connectivity disappears", () => {
    expect(effectivePlannerMode("smart", false, false)).toBe("offline");
    expect(effectivePlannerMode("economy", false, false)).toBe("offline");
    expect(effectivePlannerMode("driving", false, false)).toBe("offline");
    expect(effectivePlannerMode("private", false, false)).toBe("private");
  });

  it("only refreshes stale saved routes automatically in smart online mode", () => {
    expect(shouldAutoRefreshSavedRoute("smart", true, "stale")).toBe(true);
    expect(shouldAutoRefreshSavedRoute("offline", true, "stale")).toBe(false);
    expect(shouldAutoRefreshSavedRoute("smart", false, "stale")).toBe(false);
  });

  it("explains the primary action by planner and travel mode", () => {
    expect(plannerActionLabel("offline", "driving", true)).toBe("Usar rota offline");
    expect(plannerActionLabel("economy", "driving", true)).toBe("Calcular rota e custo");
    expect(plannerActionLabel("smart", "walking", true)).toBe("Planejar caminhada");
  });
});
