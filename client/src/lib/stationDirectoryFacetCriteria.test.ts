import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildStationDirectoryFacets,
  matchesStationDirectoryFacet,
  type StationDirectoryFacetFilters,
} from "./stationDirectoryFacets";

describe("shared station facet criteria", () => {
  const stations = Array.from({ length: 750 }, (_, i) => ({
    local: {
      neighborhood: ["Jardim Brasília", "Setor São José", "Centro"][i % 3],
      brand: ["Shell", "Ipiranga", "Sem bandeira"][i % 3],
      address: i % 6 ? "Rua " + i : "",
      dataQuality: i % 5 ? "anp-confirmed" : "",
      anp: { latitude: i % 7 ? -15.7 : 0, longitude: i % 7 ? -48.3 : 0 },
    },
    anp: null,
  }));
  const index = buildStationDirectoryFacets(stations);

  it("shares one criteria object across rows while retaining every combination", () => {
    for (const neighborhood of ["all", "jardim brasilia", "setor sao jose", "centro"]) {
      for (const brand of ["all", "shell", "ipiranga", "sem bandeira"]) {
        for (const addressOnly of [false, true]) {
          for (const anpOnly of [false, true]) {
            for (const coordinatesOnly of [false, true]) {
              const filters: StationDirectoryFacetFilters = {
                neighborhood, brand, addressOnly, anpOnly, coordinatesOnly,
              };
              const expected = stations.filter(row => {
                const facet = index.byCard.get(row)!;
                return (neighborhood === "all" || facet.neighborhood === neighborhood) &&
                  (brand === "all" || facet.brand === brand) &&
                  (!addressOnly || facet.hasAddress) &&
                  (!anpOnly || facet.hasAnp) &&
                  (!coordinatesOnly || facet.hasCoordinates);
              });
              expect(stations.filter(row =>
                matchesStationDirectoryFacet(index.byCard.get(row)!, filters),
              )).toEqual(expected);
            }
          }
        }
      }
    }
  });

  it("creates filter criteria outside the directory's per-card callback", () => {
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    const start = source.indexOf("const directoryCardsFiltered = useMemo(");
    const end = source.indexOf("const savedDirectoryPlaceIds = useMemo(", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const section = source.slice(start, end);
    expect(section).toMatch(/const facetFilters = \{[\s\S]*?coordinatesOnly: mappedOnly,[\s\S]*?\};/);
    expect(section.indexOf("const facetFilters = {"))
      .toBeLessThan(section.indexOf(".filter(item => {"));
    expect(section).toContain("matchesStationDirectoryFacet(facet, facetFilters)");
    expect(section).toContain("directoryFuelMatches.has(item)");
    expect(section).toContain("sortStationDirectoryRows(matches,");
  });
});
