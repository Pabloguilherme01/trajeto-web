import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");

describe("station directory render cost", () => {
  it("only recounts official coordinates when the ANP snapshot changes", () => {
    expect(source).toMatch(/const anpWithCoordinates = useMemo\([\s\S]*?\[anpStations\],\s*\)/);
    expect(source).not.toContain(
      "const anpWithCoordinates = anpStations.filter(",
    );
    expect(source).toContain("const anpWithoutCoordinates = Math.max(0, anpStations.length - anpWithCoordinates)");
  });

  it("reads offline map metadata only after a map snapshot update", () => {
    expect(source).toMatch(/const offlineMapAge = useMemo\([\s\S]*?getOfflineMapAgeLabel\(getOfflineMapStations\(\)\.savedAt\)[\s\S]*?\[offlineMap\],\s*\)/);
    expect(source).toContain("const [offlineMap, setOfflineMap] = useState<StationMapItem[]>");
    expect(source).toContain("setOfflineMap(mapSnapshot.stations)");
    expect(source).not.toContain(
      "const offlineMapAge = getOfflineMapAgeLabel(getOfflineMapStations().savedAt)",
    );
  });

  it("keeps the original directory filters, map memoization and offline fallback", () => {
    for (const essential of [
      "buildStationDirectoryFacets(directoryCards)",
      "matchesStationDirectoryFacet",
      "createStationDirectoryFuelMatcher(",
      "buildIndexedStationDirectorySearch(",
      "const mapStations = useMemo<StationMapItem[]>",
      "getOfflineMapStations().stations",
      "getOfflineMapAgeLabel(",
    ]) expect(source).toContain(essential);
  });
});
