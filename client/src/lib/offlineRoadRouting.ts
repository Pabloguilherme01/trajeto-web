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
  nodeIds?: Array<string | number>;
  permissions?: Partial<Record<OfflineRoadMode, "both" | "forward" | "backward" | "denied">>;
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
  spatial: Map<string, Array<{ key: string; point: OfflineRoadPoint }>>;
  referenceLat: number;
  maxSpeedMps: number;
};

const GRAPH_CACHE = new Map<OfflineRoadMode, Promise<Graph>>();
const MAP_URL = "/data/aguas-lindas-offline-map.json";
const MAX_SNAP_METERS = 320;
const SNAP_GRID_METERS = 200;
const NODE_COORDINATE_TOLERANCE_METERS = 5;
const MAX_VISITED_NODES = 65000;

const toRad = (value: number) => (value * Math.PI) / 180;

function isRoadPoint(point: OfflineRoadPoint) {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}

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

function metricPoint(point: OfflineRoadPoint, referenceLat: number) {
  const cosLat = Math.max(0.01, Math.cos(toRad(referenceLat)));
  return {
    x: point.lng * 111_320 * cosLat,
    y: point.lat * 110_574,
  };
}

function spatialKey(point: { x: number; y: number }) {
  return (
    Math.floor(point.x / SNAP_GRID_METERS) +
    ":" +
    Math.floor(point.y / SNAP_GRID_METERS)
  );
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
    // The display-only pack omits OSM node identities, access and one-way tags.
    // Never turn it into navigation guidance by assuming bidirectional access.
    const direction = road.permissions?.[mode];
    if (!["both", "forward", "backward"].includes(direction ?? "") ||
        !Array.isArray(road.points) || !Array.isArray(road.nodeIds) || road.nodeIds.length !== road.points.length ||
        !road.nodeIds.every(id => (typeof id === "number" && Number.isFinite(id)) || (typeof id === "string" && id.length > 0)) ||
        !roadAllowed(mode, road.kind) || !Array.isArray(road.points) || road.points.length < 2) continue;
    const kmh = speedKmh(mode, road.kind);
    const speedMps = kmh / 3.6;
    maxSpeed = Math.max(maxSpeed, speedMps);
    for (let index = 1; index < road.points.length; index += 1) {
      const [fromLat, fromLng] = road.points[index - 1];
      const [toLat, toLng] = road.points[index];
      const fromPoint = { lat: fromLat, lng: fromLng };
      const toPoint = { lat: toLat, lng: toLng };
      if (!isRoadPoint(fromPoint) || !isRoadPoint(toPoint)) continue;
      const from = String(road.nodeIds[index - 1]);
      const to = String(road.nodeIds[index]);
      if (from === to) continue;
      const existingFrom = nodes.get(from);
      const existingTo = nodes.get(to);
      if (
        (existingFrom &&
          distanceMeters(existingFrom, fromPoint) >
            NODE_COORDINATE_TOLERANCE_METERS) ||
        (existingTo &&
          distanceMeters(existingTo, toPoint) >
            NODE_COORDINATE_TOLERANCE_METERS)
      )
        continue;
      nodes.set(from, existingFrom ?? fromPoint);
      nodes.set(to, existingTo ?? toPoint);
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
      if (direction === "both" || direction === "forward") addEdge(from, edge);
      if (direction === "both" || direction === "backward") addEdge(to, reverse);
    }
  }

  if (nodes.size < 2 || edges.size < 1) throw new Error("Malha viária offline vazia");
  const referenceLat =
    Array.from(nodes.values()).reduce((sum, point) => sum + point.lat, 0) /
    nodes.size;
  const spatial = new Map<
    string,
    Array<{ key: string; point: OfflineRoadPoint }>
  >();
  for (const [key, point] of nodes) {
    const bucketKey = spatialKey(metricPoint(point, referenceLat));
    const bucket = spatial.get(bucketKey);
    const entry = { key, point };
    if (bucket) bucket.push(entry);
    else spatial.set(bucketKey, [entry]);
  }
  return {
    nodes,
    edges,
    spatial,
    referenceLat,
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
  if (!isRoadPoint(target)) return null;
  const metric = metricPoint(target, graph.referenceLat);
  const cellX = Math.floor(metric.x / SNAP_GRID_METERS);
  const cellY = Math.floor(metric.y / SNAP_GRID_METERS);
  const radius = Math.ceil(MAX_SNAP_METERS / SNAP_GRID_METERS) + 1;
  let best: { key: string; point: OfflineRoadPoint; meters: number } | null =
    null;
  for (let x = cellX - radius; x <= cellX + radius; x++) {
    for (let y = cellY - radius; y <= cellY + radius; y++) {
      for (const candidate of graph.spatial.get(`${x}:${y}`) ?? []) {
        const meters = distanceMeters(target, candidate.point);
        if (meters <= MAX_SNAP_METERS && (!best || meters < best.meters))
          best = { ...candidate, meters };
      }
    }
  }
  return best;
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

function bearingDegrees(a: OfflineRoadPoint, b: OfflineRoadPoint) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function turnInstruction(
  graph: Graph,
  keys: string[],
  edgeIndex: number,
  roadName: string
) {
  if (edgeIndex <= 0 || edgeIndex + 1 >= keys.length)
    return { instruction: "Continue por " + roadName, maneuver: "continue" };
  const before = graph.nodes.get(keys[edgeIndex - 1]);
  const pivot = graph.nodes.get(keys[edgeIndex]);
  const after = graph.nodes.get(keys[edgeIndex + 1]);
  if (!before || !pivot || !after)
    return { instruction: "Continue por " + roadName, maneuver: "continue" };
  const incoming = bearingDegrees(before, pivot);
  const outgoing = bearingDegrees(pivot, after);
  const delta = ((outgoing - incoming + 540) % 360) - 180;
  if (Math.abs(delta) < 30)
    return { instruction: "Continue por " + roadName, maneuver: "continue" };
  if (Math.abs(delta) > 150)
    return { instruction: "Faça o retorno para " + roadName, maneuver: "uturn" };
  return delta > 0
    ? { instruction: "Vire à direita em " + roadName, maneuver: "turn-right" }
    : { instruction: "Vire à esquerda em " + roadName, maneuver: "turn-left" };
}

function groupSteps(
  graph: Graph,
  keys: string[],
  edges: GraphEdge[]
): OfflineRoadStep[] {
  const grouped: Array<{
    name: string;
    distanceMeters: number;
    durationSeconds: number;
    startEdgeIndex: number;
  }> = [];
  edges.forEach((edge, edgeIndex) => {
    const name = edge.roadName || "via local mapeada";
    const current = grouped[grouped.length - 1];
    if (current && current.name === name) {
      current.distanceMeters += edge.distanceMeters;
      current.durationSeconds += edge.durationSeconds;
    } else {
      grouped.push({
        name,
        distanceMeters: edge.distanceMeters,
        durationSeconds: edge.durationSeconds,
        startEdgeIndex: edgeIndex,
      });
    }
  });

  const steps: OfflineRoadStep[] = grouped.map((item, index) => {
    const maneuver =
      index === 0
        ? { instruction: "Siga por " + item.name, maneuver: "depart" }
        : turnInstruction(graph, keys, item.startEdgeIndex, item.name);
    return {
      instruction: maneuver.instruction,
      name: item.name,
      distanceMeters: Math.round(item.distanceMeters),
      durationSeconds: Math.max(1, Math.round(item.durationSeconds)),
      maneuver: maneuver.maneuver,
    };
  });
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
  if (!isRoadPoint(origin) || !isRoadPoint(destination)) return null;
  const graph = await graphFor(mode).catch(() => null);
  if (!graph) return null;
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
    steps: groupSteps(graph, route.keys, route.routeEdges),
    snappedOriginMeters,
    snappedDestinationMeters,
  };
}

export function resetOfflineRoadRoutingForTests() {
  GRAPH_CACHE.clear();
}
