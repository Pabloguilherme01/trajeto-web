import { describe, expect, it } from "vitest";
import {
  PUBLIC_DATA_RESOURCES,
  SEMIURBAN_FARES,
  searchPublicDataResources,
  searchSemiurbanFares,
} from "./publicDataHub";

describe("public data hub", () => {
  it("keeps source provenance for every resource", () => {
    expect(PUBLIC_DATA_RESOURCES.length).toBeGreaterThanOrEqual(7);
    for (const item of PUBLIC_DATA_RESOURCES) {
      expect(item.sourceLabel.length).toBeGreaterThan(1);
      expect(item.sourceUrl.startsWith("https://")).toBe(true);
      expect(item.description.length).toBeGreaterThan(20);
    }
  });

  it("distinguishes official and community sources", () => {
    expect(PUBLIC_DATA_RESOURCES.find(item => item.id === "cnes-saude")?.official).toBe(true);
    expect(PUBLIC_DATA_RESOURCES.find(item => item.id === "osm-overpass")?.official).toBe(false);
  });

  it("finds citizen language without accents", () => {
    expect(searchPublicDataResources("saude").map(item => item.id)).toContain("cnes-saude");
    expect(searchPublicDataResources("escolas").map(item => item.id)).toContain("inep-escolas");
    expect(searchPublicDataResources("BR 070").map(item => item.id)).toContain("prf-acidentes");
    expect(searchPublicDataResources("farmacia").map(item => item.id)).toContain("osm-overpass");
  });

  it("publishes only verified semiurban fare snapshots", () => {
    expect(SEMIURBAN_FARES).toHaveLength(2);
    expect(searchSemiurbanFares("Taguatinga")[0]).toMatchObject({
      fare: 7.65,
      effectiveFrom: "28/06/2026",
    });
    expect(searchSemiurbanFares("Ceilandia")[0]).toMatchObject({
      fare: 5.85,
      effectiveFrom: "28/06/2026",
    });
  });
});
