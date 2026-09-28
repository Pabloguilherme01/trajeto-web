import { describe, expect, it } from "vitest";
import { summarizeSavedRoute } from "./tripReadiness";

const route = {
  savedAt: "2026-09-28T12:00:00.000Z",
  payload: {
    route: {
      distanceMeters: 24000,
      durationSeconds: 1800,
    },
  },
};

describe("summarizeSavedRoute", () => {
  it("calculates distance, duration and local fuel estimate", () => {
    expect(summarizeSavedRoute(route, { consumption: 12 }, 6, Date.parse("2026-09-28T13:00:00.000Z"))).toEqual({
      distanceKm: 24,
      durationMinutes: 30,
      estimatedFuelCost: 12,
      stale: false,
    });
  });

  it("marks an old snapshot and handles unavailable cost inputs", () => {
    const result = summarizeSavedRoute(route, null, null, Date.parse("2026-10-02T13:00:00.000Z"));
    expect(result?.distanceKm).toBe(24);
    expect(result?.durationMinutes).toBe(30);
    expect(result?.estimatedFuelCost).toBeNull();
    expect(result?.stale).toBe(true);
  });

  it("rejects malformed route payloads", () => {
    expect(summarizeSavedRoute({ ...route, payload: {} }, { consumption: 12 }, 6)).toBeNull();
    expect(summarizeSavedRoute(null, { consumption: 12 }, 6)).toBeNull();
  });
});
