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

  it("reads the offline snapshot once and updates its date only after cache changes", () => {
    expect(source).toContain("const [initialOfflineMap] = useState(getOfflineMapStations)");
    expect(source).toContain("const [offlineMap, setOfflineMap] = useState<StationMapItem[]>(initialOfflineMap.stations)");
    expect(source).toContain("const [offlineMapSavedAt, setOfflineMapSavedAt] = useState(initialOfflineMap.savedAt)");
    expect(source).toMatch(/const offlineMapAge = useMemo\([\s\S]*?getOfflineMapAgeLabel\(offlineMapSavedAt\)[\s\S]*?\[offlineMapSavedAt\],\s*\)/);
    expect(source).toContain("setOfflineMapSavedAt(mapSnapshot.savedAt)");
    expect(source).toContain("setOfflineMapSavedAt(getOfflineMapStations().savedAt)");
    expect(source).toContain("setOfflineMapSavedAt(snapshot.savedAt)");
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
      "const [initialOfflineMap] = useState(getOfflineMapStations)",
      "getOfflineMapAgeLabel(",
    ]) expect(source).toContain(essential);
  });
});
