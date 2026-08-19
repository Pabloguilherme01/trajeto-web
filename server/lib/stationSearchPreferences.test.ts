import { describe, expect, it } from "vitest";
import { normalizeStationSearchPreferences, stationSearchPreferenceDefaults } from "./stationSearchPreferences";

describe("station search preferences", () => {
  it("preserves controlled filter values and falls back safely", () => {
    expect(normalizeStationSearchPreferences({ mappedBrand: " Shell ", hoursStatus: "open", sortBy: "hours", anpNeighborhood: "Centro", anpBrand: "Vibra", resultsPerView: 20, economicMode: false })).toEqual({ mappedBrand: "Shell", hoursStatus: "open", sortBy: "hours", anpNeighborhood: "Centro", anpBrand: "Vibra", resultsPerView: 20, economicMode: false });
    expect(normalizeStationSearchPreferences({ resultsPerView: 10, economicMode: true }).resultsPerView).toBe(5);
    expect(normalizeStationSearchPreferences({ hoursStatus: "anything" as never, sortBy: "nearest" as never })).toEqual(stationSearchPreferenceDefaults);
  });
});
