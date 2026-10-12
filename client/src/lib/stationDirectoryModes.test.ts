import { describe, expect, it } from "vitest";
import { countStationDirectoryModes, criteriaForStationDirectoryPreset, getStationDirectoryMode } from "./stationDirectoryModes";
import { buildStationDirectoryFacets, matchesStationDirectoryFacet } from "./stationDirectoryFacets";
import type { StationDirectoryFacetFilters } from "./stationDirectoryFacets";

const initial: StationDirectoryFacetFilters = {
  neighborhood: "all", brand: "all", addressOnly: false,
  anpOnly: false, coordinatesOnly: false,
};
const presets = ["all", "anp", "route", "address"] as const;

describe("station directory quick modes", () => {
  it("previews every preset against text/fuel matches using the existing facet rules", () => {
    const cards = [
      { anp: { bairro: "Centro", endereco: "BR-070", latitude: -15.7, longitude: -48.2 } },
      { local: { address: "Rua 1", neighborhood: "Jardim", brand: "Shell" } },
      { local: { neighborhood: "Centro" } },
    ];
    const facets = buildStationDirectoryFacets(cards).byCard;
    for (const searched of [cards, cards.slice(0, 2), []]) {
      for (const fuel of [null, new Set([cards[0]]), new Set<typeof cards[number]>()]) {
        const counts = countStationDirectoryModes(searched, facets, fuel);
        for (const mode of presets) {
          const expected = searched.filter(card => (!fuel || fuel.has(card)) &&
            matchesStationDirectoryFacet(facets.get(card)!, criteriaForStationDirectoryPreset(mode)));
          expect(counts[mode]).toBe(expected.length);
        }
      }
    }
    expect(countStationDirectoryModes(cards, facets, null)).toEqual({ all: 3, anp: 1, route: 1, address: 2 });
    expect(countStationDirectoryModes(cards.slice(1), facets, null)).toEqual({ all: 2, anp: 0, route: 0, address: 1 });
  });

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
