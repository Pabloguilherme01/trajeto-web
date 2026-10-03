import { describe, expect, it } from "vitest";
import {
  buildCityAtlas,
  cityAtlasCounts,
  filterCityAtlas,
  normalizeCityAtlasSnapshot,
  resolveCityAtlasPoint,
  type CityAtlasSnapshot,
} from "./cityAtlas";

function snapshot(): CityAtlasSnapshot {
  return {
    schema: 1,
    updatedAt: "2026-10-02",
    city: {
      name: "Águas Lindas de Goiás",
      state: "GO",
      ibgeCode: "5200258",
      areaKm2: 191.817,
      populationCensus2022: 225693,
      populationEstimate2026: 249978,
      profileSourceId: "official",
    },
    sources: [
      { id: "official", label: "Fonte oficial", url: "https://example.com" },
    ],
    items: [
      {
        id: "escola-teste",
        name: "Escola Municipal Teste",
        detail: "Rede municipal",
        category: "educacao",
        address: "Jardim Brasília, Águas Lindas de Goiás - GO",
        destination: "Escola Municipal Teste, Jardim Brasília, Águas Lindas de Goiás - GO",
        sourceId: "official",
        verifiedAt: "2026-10-02",
        keywords: ["escola"],
      },
    ],
  };
}

describe("city atlas", () => {
  it("validates a versioned official snapshot", () => {
    expect(normalizeCityAtlasSnapshot(snapshot())?.city.ibgeCode).toBe("5200258");
  });

  it("drops a record with unsafe coordinates without losing the city atlas", () => {
    const value = snapshot() as any;
    value.items[0].lat = 190;
    const normalized = normalizeCityAtlasSnapshot(value);
    expect(normalized).not.toBeNull();
    expect(normalized?.items).toHaveLength(0);
  });

  it("rejects duplicate ids, invalid verification dates and missing profile sources", () => {
    const duplicate = snapshot() as any;
    duplicate.items.push({ ...duplicate.items[0] });
    expect(normalizeCityAtlasSnapshot(duplicate)).toBeNull();

    const invalidDate = snapshot() as any;
    invalidDate.items[0].verifiedAt = "not-a-date";
    expect(normalizeCityAtlasSnapshot(invalidDate)?.items).toHaveLength(0);

    const missingProfileSource = snapshot() as any;
    missingProfileSource.city.profileSourceId = "missing";
    expect(normalizeCityAtlasSnapshot(missingProfileSource)).toBeNull();
  });

  it("rejects coordinates without explicit official provenance", () => {
    const value = snapshot() as any;
    value.items[0].lat = -15.75;
    value.items[0].lng = -48.28;
    expect(normalizeCityAtlasSnapshot(value)?.items).toHaveLength(0);

    value.items[0].coordinateSourceId = "official";
    value.items[0].coordinateVerifiedAt = "2026-10-02";
    expect(normalizeCityAtlasSnapshot(value)?.items).toHaveLength(1);
  });

  it("merges supplemental official data with the existing city catalog", () => {
    const items = buildCityAtlas(snapshot());
    const school = items.find(item => item.name === "Escola Municipal Teste");
    expect(school?.sourceLabel).toBe("Fonte oficial");
    expect(school?.category).toBe("educacao");
  });

  it("searches accents, addresses and layers without changing the source data", () => {
    const items = buildCityAtlas(snapshot());
    expect(filterCityAtlas(items, "jardim brasilia", "educacao").some(item => item.name === "Escola Municipal Teste")).toBe(true);
    expect(filterCityAtlas(items, "escola", "saude").some(item => item.name === "Escola Municipal Teste")).toBe(false);
  });

  it("counts layers for map controls", () => {
    const counts = cityAtlasCounts(buildCityAtlas(snapshot()));
    expect((counts.educacao ?? 0) > 0).toBe(true);
    expect((counts.saude ?? 0) > 0).toBe(true);
  });

  it("resolves a unique mapped destination for the internal planner preview", () => {
    const value = snapshot();
    value.items[0].lat = -15.75;
    value.items[0].lng = -48.28;
    value.items[0].coordinateSourceId = "official";
    value.items[0].coordinateVerifiedAt = "2026-10-02";
    expect(resolveCityAtlasPoint(value, "Escola Municipal Teste")).toEqual({
      lat: -15.75,
      lng: -48.28,
    });
  });

});
