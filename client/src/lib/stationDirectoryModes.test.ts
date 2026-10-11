import { describe, expect, it } from "vitest";
import { criteriaForStationDirectoryPreset, getStationDirectoryMode } from "./stationDirectoryModes";
import type { StationDirectoryFacetFilters } from "./stationDirectoryFacets";

const initial: StationDirectoryFacetFilters = {
  neighborhood: "all", brand: "all", addressOnly: false,
  anpOnly: false, coordinatesOnly: false,
};
const presets = ["all", "anp", "route", "address"] as const;

describe("station directory quick modes", () => {
  it("gives every preset its own exclusive criteria and a round-trip active mode", () => {
    for (const preset of presets) {
      const filters = criteriaForStationDirectoryPreset(preset);
      expect(filters.neighborhood).toBe("all");
      expect(filters.brand).toBe("all");
      expect(getStationDirectoryMode(filters)).toBe(preset);
      expect(Number(filters.addressOnly) + Number(filters.anpOnly) + Number(filters.coordinatesOnly))
        .toBe(preset === "all" ? 0 : 1);
    }
  });

  it("returns custom when the user combines two quality flags or a region/brand facet", () => {
    expect(getStationDirectoryMode({ ...initial, anpOnly: true, coordinatesOnly: true })).toBe("custom");
    expect(getStationDirectoryMode({ ...initial, addressOnly: true, coordinatesOnly: true })).toBe("custom");
    expect(getStationDirectoryMode({ ...initial, neighborhood: "jardim brasilia" })).toBe("custom");
    expect(getStationDirectoryMode({ ...initial, brand: "shell", anpOnly: true })).toBe("custom");
  });

  it("allows switching from a customized set to each mode without carrying hidden facet flags", () => {
    const customized: StationDirectoryFacetFilters = {
      neighborhood: "jardim brasilia", brand: "shell", addressOnly: true,
      anpOnly: true, coordinatesOnly: true,
    };
    for (const mode of presets) {
      const result = { ...customized, ...criteriaForStationDirectoryPreset(mode) };
      expect(result).toEqual(criteriaForStationDirectoryPreset(mode));
      expect(getStationDirectoryMode(result)).toBe(mode);
    }
  });

  it("does not include text, fuel, location or ordering in the preset settings", () => {
    const preserved = {
      search: "BR-070", fuel: "diesel-s10", sort: "distance", userCoords: { lat: -15.76, lng: -48.28 },
    };
    for (const preset of presets) {
      const combined = { ...preserved, filters: criteriaForStationDirectoryPreset(preset) };
      expect(combined.search).toBe(preserved.search);
      expect(combined.fuel).toBe(preserved.fuel);
      expect(combined.sort).toBe(preserved.sort);
      expect(combined.userCoords).toBe(preserved.userCoords);
    }
  });
});
