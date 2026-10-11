import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("station map enrichment identity memo", () => {
  const source = readFileSync(new URL("../components/StationMap.tsx", import.meta.url), "utf8");

  it("recomputes the key only when the resolved catalog changes", () => {
    expect(source).toMatch(
      /const resolveStationKeys = useMemo\(\s*\(\) => resolvedStations\.map\(item => item\.cnpj \|\| item\.id \|\| item\.name\)\.join\("\|"\),\s*\[resolvedStations\],\s*\)/,
    );
    expect(source).toContain("}, [ready, offline, resolveStationKeys]);");
    expect(source).not.toContain(
      '}, [ready, offline, resolvedStations.map(item => item.cnpj || item.id || item.name).join("|")]);',
    );
    expect(source).toContain("restoreStationCoordinates(stations, readCachedCoordinate)");
  });

  it("keeps coordinate changes independent of station identity while reacting to new records", () => {
    type Item = { cnpj?: string; id?: string; name: string; lat?: number; lng?: number };
    const signature = (items: Item[]) =>
      items.map(item => item.cnpj || item.id || item.name).join("|");
    const original = [
      { cnpj: "1234", name: "Posto A", lat: -15.78, lng: -48.28 },
      { id: "local-2", name: "Posto B" },
    ];
    expect(signature(original)).toBe(
      signature([{ ...original[0], lat: -15.79 }, { ...original[1], lng: -48.29 }]),
    );
    expect(signature([...original, { id: "local-3", name: "Posto C" }]))
      .not.toBe(signature(original));
  });
});
