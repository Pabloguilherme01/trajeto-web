import { describe, expect, it } from "vitest";
import { prepareOfflineRoadIndex, ROAD_GRID } from "./offlineMapRoadIndex";

const pack = {
  roads: [
    { id: 7, name: "BR-070", kind: "primary", points: [[-15.75, -48.29], [-15.76, -48.27]] as [number, number][] },
    { id: 8, name: "Rua local", kind: "residential", points: [[-15.751, -48.291], [-15.752, -48.282]] as [number, number][] },
  ],
};

describe("offline map compiled road spatial index", () => {
  it("builds one index per immutable map snapshot and reuses every compiled geometry on reopen", () => {
    const first = prepareOfflineRoadIndex(pack);
    expect(prepareOfflineRoadIndex(pack)).toBe(first);
    expect(prepareOfflineRoadIndex(pack).roadGrid).toBe(first.roadGrid);
    const freshPack = { roads: pack.roads.map(road => ({ ...road, points: road.points.map(p => [...p] as [number, number]) })) };
    const refreshed = prepareOfflineRoadIndex(freshPack);
    expect(refreshed).not.toBe(first);
    expect(refreshed).toEqual(first);
  });

  it("preserves road priority, source identity, geometry, path and spatial coverage", () => {
    const result = prepareOfflineRoadIndex(pack);
    expect(result.roads.map(road => road.id)).toEqual([8, 7]);
    expect(result.roads.map(road => road.priority)).toEqual([1, 4]);
    for (const road of result.roads) {
      expect(road.world).toHaveLength(2);
      expect(road.path).toMatch(/^M\d+\.\d{8} \d+\.\d{8} L\d+\.\d{8} \d+\.\d{8}$/);
      expect(road.bounds.minX).toBeLessThanOrEqual(road.world[0].x);
      expect(road.bounds.maxX).toBeGreaterThanOrEqual(road.world[1].x);
      const key = Math.floor(road.world[0].x * ROAD_GRID) + ":" + Math.floor(road.world[0].y * ROAD_GRID);
      expect(result.roadGrid.get(key)).toContain(result.roads.indexOf(road));
    }
    expect(pack.roads.map(road => road.id)).toEqual([7, 8]);
  });

  it("does not recompile a large package when switching back to the same map snapshot", () => {
    const roads = Array.from({ length: 1000 }, (_, i) => ({
      id: i, name: "Trecho " + i, kind: i % 2 ? "primary" : "residential",
      points: [[-15.75, -48.29], [-15.76, -48.27]] as [number, number][],
    }));
    const bigPack = { roads };
    const first = prepareOfflineRoadIndex(bigPack);
    for (let n = 0; n < 20; n++) {
      const index = prepareOfflineRoadIndex(bigPack);
      expect(index).toBe(first);
      expect(index.roads).toBe(first.roads);
      expect(index.roadGrid).toBe(first.roadGrid);
    }
    expect(first.roads).toHaveLength(1000);
  });
});
