import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("stations active directory processing path", () => {
  it("avoids recomputing an unmounted legacy directory on every filter change", () => {
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    expect(source.match(/searchAguasLindasStations\(/g)).toHaveLength(1);
    for (const orphan of [
      "const localDirectory = useMemo", "visibleLocalDirectory",
      "hasMoreLocalStations", "localVisibleCount", "resetLocalFilters",
      "exportLocalCsv", "copyAddress", "copyCnpj",
    ]) expect(source).not.toContain(orphan);
  });

  it("keeps the used directory, map, ANP export and functional filters", () => {
    const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");
    for (const required of [
      "mergeStationDirectoryRows(aguasLindasCatalog, anpStations)",
      "buildIndexedStationDirectorySearch(", "buildStationDirectoryFacets(directoryCards)",
      "matchesStationDirectoryFacet", "sortStationDirectoryRows(",
      "prepareVisibleStationDirectoryCards(", "directoryCardsFiltered",
      "const exportAnpCsv = () =>", "deduplicateStationMapItems(",
      'aria-label="Filtrar diretório por bairro"',
      'aria-label="Filtrar diretório por bandeira"',
    ]) expect(source).toContain(required);
  });
});
