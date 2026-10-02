export type GtfsStaticSnapshot = {
  schema: 1;
  feedId: string;
  sourceId: string;
  generatedAt: string;
  validFrom?: string;
  validUntil?: string;
  agencies: Array<{ id: string; name: string }>;
  routes: Array<{ id: string; agencyId?: string; shortName?: string; longName?: string }>;
  stops: Array<{ id: string; name: string; lat: number; lng: number }>;
  trips: Array<{ id: string; routeId: string; serviceId: string; shapeId?: string }>;
  stopTimes: Array<{ tripId: string; stopId: string; sequence: number; arrival?: string; departure?: string }>;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown) { return typeof value === "string" && value.trim().length > 0; }
function coordinate(value: unknown, limit: number) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}
function uniqueIds(items: Array<{ id: string }>) {
  return new Set(items.map(item => item.id)).size === items.length;
}

export function normalizeGtfsStaticSnapshot(value: unknown): GtfsStaticSnapshot | null {
  if (!record(value) || value.schema !== 1 || !text(value.feedId) || !text(value.sourceId)) return null;
  if (!text(value.generatedAt) || !Number.isFinite(Date.parse(value.generatedAt as string))) return null;
  if (!Array.isArray(value.agencies) || !Array.isArray(value.routes) || !Array.isArray(value.stops) ||
      !Array.isArray(value.trips) || !Array.isArray(value.stopTimes)) return null;

  const agencies = value.agencies.flatMap(raw => record(raw) && text(raw.id) && text(raw.name)
    ? [{ id: raw.id as string, name: raw.name as string }] : []);
  const routes = value.routes.flatMap(raw => record(raw) && text(raw.id)
    ? [{ id: raw.id as string, agencyId: text(raw.agencyId) ? raw.agencyId as string : undefined,
        shortName: text(raw.shortName) ? raw.shortName as string : undefined,
        longName: text(raw.longName) ? raw.longName as string : undefined }] : []);
  const stops = value.stops.flatMap(raw => record(raw) && text(raw.id) && text(raw.name) &&
      coordinate(raw.lat, 90) && coordinate(raw.lng, 180)
    ? [{ id: raw.id as string, name: raw.name as string, lat: raw.lat as number, lng: raw.lng as number }] : []);
  const trips = value.trips.flatMap(raw => record(raw) && text(raw.id) && text(raw.routeId) && text(raw.serviceId)
    ? [{ id: raw.id as string, routeId: raw.routeId as string, serviceId: raw.serviceId as string,
        shapeId: text(raw.shapeId) ? raw.shapeId as string : undefined }] : []);
  const stopTimes = value.stopTimes.flatMap(raw => record(raw) && text(raw.tripId) && text(raw.stopId) &&
      typeof raw.sequence === "number" && Number.isInteger(raw.sequence) && raw.sequence >= 0
    ? [{ tripId: raw.tripId as string, stopId: raw.stopId as string, sequence: raw.sequence as number,
        arrival: text(raw.arrival) ? raw.arrival as string : undefined,
        departure: text(raw.departure) ? raw.departure as string : undefined }] : []);

  if (agencies.length !== value.agencies.length || routes.length !== value.routes.length ||
      stops.length !== value.stops.length || trips.length !== value.trips.length ||
      stopTimes.length !== value.stopTimes.length) return null;
  if (![agencies, routes, stops, trips].every(uniqueIds)) return null;

  const agencyIds = new Set(agencies.map(item => item.id));
  const routeIds = new Set(routes.map(item => item.id));
  const stopIds = new Set(stops.map(item => item.id));
  const tripIds = new Set(trips.map(item => item.id));
  if (routes.some(item => item.agencyId && !agencyIds.has(item.agencyId))) return null;
  if (trips.some(item => !routeIds.has(item.routeId))) return null;
  if (stopTimes.some(item => !tripIds.has(item.tripId) || !stopIds.has(item.stopId))) return null;

  return {
    schema: 1, feedId: value.feedId as string, sourceId: value.sourceId as string,
    generatedAt: value.generatedAt as string, agencies, routes, stops, trips, stopTimes,
  };
}
