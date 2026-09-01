import { describe, expect, it } from "vitest";
import { normalizeStationSearchPreferences, stationSearchPreferenceDefaults } from "./stationSearchPreferences";

describe("station search preferences", () => {
  it("preserves controlled filter values and falls back safely", () => {
    expect(normalizeStationSearchPreferences({ mappedBrand: " Shell ", hoursStatus: "open", sortBy: "hours", anpNeighborhood: "Centro", anpBrand: "Vibra" })).toEqual({ mappedBrand: "Shell", hoursStatus: "open", sortBy: "hours", anpNeighborhood: "Centro", anpBrand: "Vibra" });
    expect(normalizeStationSearchPreferences({ hoursStatus: "anything" as never, sortBy: "nearest" as never })).toEqual(stationSearchPreferenceDefaults);
  });
});
