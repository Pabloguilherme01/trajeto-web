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

  it("shares the mobile filter rail with advanced station filters for keyboard accessibility", () => {
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    expect(source).toContain('import { useFilterRail } from "@/hooks/useFilterRail";');
    expect(source).toContain("useFilterRail(`${Number(verifiedOnly)}:${Number(addressOnly)}:${Number(mappedOnly)}`");
    expect(source).toContain("ref={extraFiltersRailRef} onFocusCapture={onExtraFilterFocus}");
    expect(source).toContain('aria-label="Filtros adicionais dos postos"');
  });

  it("shares criteria across cards and avoids refiltering when sort or location changes", () => {
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    const matchStart = source.indexOf("const directoryCardsMatched = useMemo(");
    const sortStart = source.indexOf("const directoryCardsFiltered = useMemo(", matchStart);
    const end = source.indexOf("const savedDirectoryPlaceIds = useMemo(", sortStart);
    expect(matchStart).toBeGreaterThan(-1);
    expect(sortStart).toBeGreaterThan(matchStart);
    expect(end).toBeGreaterThan(sortStart);
    const matching = source.slice(matchStart, sortStart);
    const sorting = source.slice(sortStart, end);
    expect(matching).toMatch(/const facetFilters = \{[\s\S]*?coordinatesOnly: mappedOnly,[\s\S]*?\};/);
    expect(matching.indexOf("const facetFilters = {"))
      .toBeLessThan(matching.indexOf(".filter(item => {"));
    expect(matching).toContain("matchesStationDirectoryFacet(facet, facetFilters)");
    expect(matching).toContain("directoryFuelMatches.has(item)");
    // Default view should not walk the indexed results a second time.
    expect(matching).toContain('neighborhoodFilter === "all" && brandFilter === "all"');
    expect(matching).toContain("!addressOnly && !verifiedOnly && !mappedOnly && !directoryFuelMatches");
    expect(matching).toContain("return textMatches;");
    expect(matching.indexOf("return textMatches;"))
      .toBeLessThan(matching.indexOf("textMatches.filter(item => {"));
    expect(matching).not.toContain("sortStationDirectoryRows(");
    // The filter memo must not depend on sort mode, geolocation or prices
    // directly. Fuel matching already encapsulates any snapshot changes.
    const matchingDeps = matching.slice(matching.lastIndexOf("}, ["));
    expect(matchingDeps).not.toContain("directorySort");
    expect(matchingDeps).not.toContain("userCoords");
    expect(matchingDeps).not.toContain("pricesByCnpj");
    expect(sorting).toContain("sortStationDirectoryRows(");
    expect(sorting).toContain("directoryCardsMatched, directorySort, userCoords, fuelFilter, pricesByCnpj");
    expect(sorting).toContain("[directoryCardsMatched, directorySort, userCoords, fuelFilter, pricesByCnpj]");
  });
});
