import { roadPriority } from "./mapPresentation";

export const ROAD_GRID = 4096;
type OfflineRoad = { id: number; kind: string; name: string; points: [number, number][] };
type RoadPack = { roads: OfflineRoad[] };
type WorldPoint = { x: number; y: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
export type PreparedRoad = OfflineRoad & {
  priority: number; world: WorldPoint[]; bounds: Bounds; path: string;
};
export type PreparedRoadIndex = {
  roads: PreparedRoad[];
  roadGrid: Map<string, number[]>;
};

// loadOfflineMapPack() keeps the same validated snapshot while navigating
// between map/planner screens. Reuse its expensive Mercator + SVG/grid work
// across mounts. Weak keys never keep replaced snapshots alive by themselves.
const preparedByPack = new WeakMap<RoadPack, PreparedRoadIndex>();

function roadWorld(lat: number, lng: number): WorldPoint {
  const latitude = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  return {
    x: (lng + 180) / 360,
    y: (1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2,
  };
}

/** Geometry and spatial buckets are built only once per validated pack object. */
export function prepareOfflineRoadIndex(pack: RoadPack): PreparedRoadIndex {
  const cached = preparedByPack.get(pack);
  if (cached) return cached;

  const roads = pack.roads.map(road => {
    const world: WorldPoint[] = [];
    const bounds: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    const segments: string[] = [];
    for (const [lat, lng] of road.points) {
      const point = roadWorld(lat, lng);
      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.minY = Math.min(bounds.minY, point.y);
      bounds.maxY = Math.max(bounds.maxY, point.y);
      segments.push((world.length ? "L" : "M") + point.x.toFixed(8) + " " + point.y.toFixed(8));
      world.push(point);
    }
    return { ...road, priority: roadPriority(road.kind), world, bounds, path: segments.join(" ") };
  }).sort((a, b) => a.priority - b.priority);

  const roadGrid = new Map<string, number[]>();
  roads.forEach((road, index) => {
    const minX = Math.floor(road.bounds.minX * ROAD_GRID);
    const maxX = Math.floor(road.bounds.maxX * ROAD_GRID);
    const minY = Math.floor(road.bounds.minY * ROAD_GRID);
    const maxY = Math.floor(road.bounds.maxY * ROAD_GRID);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = x + ":" + y;
        const bucket = roadGrid.get(key);
        if (bucket) bucket.push(index);
        else roadGrid.set(key, [index]);
      }
    }
  });
  const prepared = { roads, roadGrid };
  preparedByPack.set(pack, prepared);
  return prepared;
}
