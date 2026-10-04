import { appUrl } from "./appUrl";

export type OfflineRoadPoint = { lat: number; lng: number };
export type OfflineRoadMode = "driving" | "walking" | "cycling";
export type OfflineRoadStep = {
  instruction: string;
  name?: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver?: string;
};
export type OfflineRoadRoute = {
  points: OfflineRoadPoint[];
  distanceMeters: number;
  durationSeconds: number;
  steps: OfflineRoadStep[];
  snappedOriginMeters: number;
  snappedDestinationMeters: number;
};

type PackedRoad = {
  id: number;
  kind: string;
  name: string;
  points: [number, number][];
};
type PackedMap = {
  schema: number;
  retrievedAt: string;
  roads: PackedRoad[];
};
type GraphEdge = {
  to: string;
  distanceMeters: number;
  durationSeconds: number;
  roadName: string;
  kind: string;
};
type Graph = {
  nodes: Map<string, OfflineRoadPoint>;
  edges: Map<string, GraphEdge[]>;
  searchable: Array<{ key: string; point: OfflineRoadPoint }>;
  maxSpeedMps: number;
};

const GRAPH_CACHE = new Map<OfflineRoadMode, Promise<Graph>>();
const MAP_URL = "/data/aguas-lindas-offline-map.json";
const MAX_SNAP_METERS = 320;
const MAX_VISITED_NODES = 65000;

const toRad = (value: number) => (value * Math.PI) / 180;

function distanceMeters(a: OfflineRoadPoint, b: OfflineRoadPoint) {
  const earthRadiusMeters = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function pointKey(point: OfflineRoadPoint) {
  return point.lat.toFixed(5) + "," + point.lng.toFixed(5);
}

function speedKmh(mode: OfflineRoadMode, kind: string) {
  if (mode === "walking") return 4.8;
  if (mode === "cycling") return kind === "path" || kind === "cycleway" ? 14 : 17;
  if (kind === "motorway") return 80;
  if (kind === "trunk") return 65;
  if (kind === "primary") return 52;
  if (kind === "secondary") return 45;
  if (kind === "tertiary") return 36;
  if (kind === "residential") return 26;
  if (kind === "service") return 16;
  return 22;
}

function roadAllowed(mode: OfflineRoadMode, kind: string) {
  const normalized = kind.toLowerCase();
  if (mode === "driving") {
    return !["footway", "pedestrian", "path", "cycleway", "steps", "bridleway"].includes(normalized);
  }
  if (mode === "cycling") {
    return !["motorway", "motorway_link", "trunk", "trunk_link", "steps"].includes(normalized);
  }
  return !["motorway", "motorway_link", "trunk", "trunk_link"].includes(normalized);
}

async function loadPack(): Promise<PackedMap> {
  const response = await fetch(appUrl(MAP_URL));
  if (!response.ok) throw new Error("Mapa offline indisponível");
  const data = (await response.json()) as PackedMap;
  if (
    data.schema !== 1 ||
    !Array.isArray(data.roads) ||
    data.roads.length === 0 ||
    data.roads.length > 12000
  ) {
    throw new Error("Pacote viário offline inválido");
  }
  return data;
}

function buildGraph(pack: PackedMap, mode: OfflineRoadMode): Graph {
  const nodes = new Map<string, OfflineRoadPoint>();
  const edges = new Map<string, GraphEdge[]>();
  let maxSpeed = 1;

  const addEdge = (from: string, edge: GraphEdge) => {
    const list = edges.get(from);
    if (list) list.push(edge);
    else edges.set(from, [edge]);
  };

  for (const road of pack.roads) {
    if (!roadAllowed(mode, road.kind) || !Array.isArray(road.points) || road.points.length < 2) continue;
    const kmh = speedKmh(mode, road.kind);
    const speedMps = kmh / 3.6;
    maxSpeed = Math.max(maxSpeed, speedMps);
    for (let index = 1; index < road.points.length; index += 1) {
      const [fromLat, fromLng] = road.points[index - 1];
      const [toLat, toLng] = road.points[index];
      if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) continue;
      const fromPoint = { lat: fromLat, lng: fromLng };
      const toPoint = { lat: toLat, lng: toLng };
      const from = pointKey(fromPoint);
      const to = pointKey(toPoint);
      if (from === to) continue;
      nodes.set(from, nodes.get(from) ?? fromPoint);
      nodes.set(to, nodes.get(to) ?? toPoint);
      const meters = distanceMeters(fromPoint, toPoint);
      if (!Number.isFinite(meters) || meters < 0.5 || meters > 2500) continue;
      const durationSeconds = meters / Math.max(1, speedMps);
      const edge = {
        to,
        distanceMeters: meters,
        durationSeconds,
        roadName: road.name.trim(),
        kind: road.kind,
      };
      const reverse = { ...edge, to: from };
      addEdge(from, edge);
      addEdge(to, reverse);
    }
  }

  if (nodes.size < 2 || edges.size < 1) throw new Error("Malha viária offline vazia");
  return {
    nodes,
    edges,
    searchable: Array.from(nodes, ([key, point]) => ({ key, point })),
    maxSpeedMps: maxSpeed,
  };
}

async function graphFor(mode: OfflineRoadMode) {
  let graph = GRAPH_CACHE.get(mode);
  if (!graph) {
    graph = loadPack().then(pack => buildGraph(pack, mode)).catch(error => {
      GRAPH_CACHE.delete(mode);
      throw error;
    });
    GRAPH_CACHE.set(mode, graph);
  }
  return graph;
}

function nearestNode(graph: Graph, target: OfflineRoadPoint) {
  let best: { key: string; point: OfflineRoadPoint; meters: number } | null = null;
  for (const candidate of graph.searchable) {
    const meters = distanceMeters(target, candidate.point);
    if (!best || meters < best.meters) best = { ...candidate, meters };
  }
  return best && best.meters <= MAX_SNAP_METERS ? best : null;
}

class MinHeap {
  private values: Array<{ key: string; priority: number }> = [];

  push(value: { key: string; priority: number }) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent].priority <= value.priority) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }

  pop() {
    if (!this.values.length) return undefined;
    const root = this.values[0];
    const last = this.values.pop()!;
    if (this.values.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.values.length) break;
        const child =
          right < this.values.length && this.values[right].priority < this.values[left].priority
            ? right
            : left;
        if (this.values[child].priority >= last.priority) break;
        this.values[index] = this.values[child];
        index = child;
      }
      this.values[index] = last;
    }
    return root;
  }
}

function shortestPath(graph: Graph, start: string, goal: string) {
  const goalPoint = graph.nodes.get(goal);
  if (!goalPoint) return null;
  const open = new MinHeap();
  const score = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, { from: string; edge: GraphEdge }>();
  const closed = new Set<string>();
  open.push({ key: start, priority: 0 });

  while (closed.size < MAX_VISITED_NODES) {
    const current = open.pop();
    if (!current) break;
    if (closed.has(current.key)) continue;
    if (current.key === goal) break;
    closed.add(current.key);
    const currentScore = score.get(current.key);
    if (currentScore == null) continue;

    for (const edge of graph.edges.get(current.key) ?? []) {
      if (closed.has(edge.to)) continue;
      const nextScore = currentScore + edge.durationSeconds;
      if (nextScore >= (score.get(edge.to) ?? Infinity)) continue;
      score.set(edge.to, nextScore);
      previous.set(edge.to, { from: current.key, edge });
      const nextPoint = graph.nodes.get(edge.to);
      const heuristic =
        nextPoint ? distanceMeters(nextPoint, goalPoint) / Math.max(1, graph.maxSpeedMps) : 0;
      open.push({ key: edge.to, priority: nextScore + heuristic });
    }
  }

  if (start !== goal && !previous.has(goal)) return null;
  const keys = [goal];
  const routeEdges: GraphEdge[] = [];
  let cursor = goal;
  while (cursor !== start) {
    const step = previous.get(cursor);
    if (!step) return null;
    routeEdges.push(step.edge);
    cursor = step.from;
    keys.push(cursor);
  }
  keys.reverse();
  routeEdges.reverse();
  return { keys, routeEdges };
}

function groupSteps(edges: GraphEdge[]): OfflineRoadStep[] {
  const grouped: Array<{ name: string; distanceMeters: number; durationSeconds: number }> = [];
  for (const edge of edges) {
    const name = edge.roadName || "via local mapeada";
    const current = grouped[grouped.length - 1];
    if (current && current.name === name) {
      current.distanceMeters += edge.distanceMeters;
      current.durationSeconds += edge.durationSeconds;
    } else {
      grouped.push({ name, distanceMeters: edge.distanceMeters, durationSeconds: edge.durationSeconds });
    }
  }

  const steps = grouped.map((item, index) => ({
    instruction: index === 0 ? "Siga por " + item.name : "Continue por " + item.name,
    name: item.name,
    distanceMeters: Math.round(item.distanceMeters),
    durationSeconds: Math.max(1, Math.round(item.durationSeconds)),
    maneuver: "continue",
  }));
  if (steps.length) {
    steps.push({
      instruction: "Chegue ao destino",
      distanceMeters: 0,
      durationSeconds: 0,
      maneuver: "arrive",
    });
  }
  return steps;
}

export async function calculateOfflineRoadRoute(
  origin: OfflineRoadPoint,
  destination: OfflineRoadPoint,
  mode: OfflineRoadMode
): Promise<OfflineRoadRoute | null> {
  const graph = await graphFor(mode);
  const start = nearestNode(graph, origin);
  const finish = nearestNode(graph, destination);
  if (!start || !finish) return null;
  const route = shortestPath(graph, start.key, finish.key);
  if (!route || route.keys.length < 2) return null;

  const roadPoints = route.keys
    .map(key => graph.nodes.get(key))
    .filter((point): point is OfflineRoadPoint => Boolean(point));
  if (roadPoints.length < 2) return null;

  const snappedOriginMeters = start.meters;
  const snappedDestinationMeters = finish.meters;
  const networkDistance = route.routeEdges.reduce((sum, edge) => sum + edge.distanceMeters, 0);
  const networkDuration = route.routeEdges.reduce((sum, edge) => sum + edge.durationSeconds, 0);
  const connectorMeters = snappedOriginMeters + snappedDestinationMeters;
  const connectorSpeedMps = mode === "walking" ? 1.3 : mode === "cycling" ? 4.2 : 7;
  const points = [
    ...(snappedOriginMeters > 8 ? [origin] : []),
    ...roadPoints,
    ...(snappedDestinationMeters > 8 ? [destination] : []),
  ];

  return {
    points,
    distanceMeters: Math.max(50, Math.round(networkDistance + connectorMeters)),
    durationSeconds: Math.max(
      60,
      Math.round(networkDuration + connectorMeters / connectorSpeedMps)
    ),
    steps: groupSteps(route.routeEdges),
    snappedOriginMeters,
    snappedDestinationMeters,
  };
}

export function resetOfflineRoadRoutingForTests() {
  GRAPH_CACHE.clear();
}
