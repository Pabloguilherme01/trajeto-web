export type MapboxCoordinate = { lat: number; lng: number };
export type MapboxTravelMode = "driving" | "walking" | "cycling" | "transit";

export type MapboxRouteStep = {
  instruction: string;
  streetName?: string;
  distanceMeters: number;
  durationSeconds: number;
  location?: { lat: number; lng: number };
};

export type MapboxRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
  steps?: MapboxRouteStep[];
};

const DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";
const REQUEST_TIMEOUT_MS = 6_000;
const FAILURE_COOLDOWN_MS = 2 * 60_000;
let unavailableUntil = 0;
let inFlight = new Map<string, Promise<MapboxRouteResult | null>>();

export function getOptionalMapboxToken() {
  return import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.trim() || "";
}

export function hasOptionalMapboxConfigured(
  token = getOptionalMapboxToken()
) {
  return token.startsWith("pk.") && token.length > 8;
}

export function resetOptionalMapboxTestState() {
  if (import.meta.env.MODE !== "test") return;
  unavailableUntil = 0;
  inFlight.clear();
}

export function isOptionalMapboxCoolingDown(now = Date.now()) {
  return unavailableUntil > now;
}

function profileFor(mode: MapboxTravelMode) {
  if (mode === "driving") return "driving-traffic";
  if (mode === "walking") return "walking";
  if (mode === "cycling") return "cycling";
  return null;
}

type MapboxDirectionsResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: string;
    legs?: Array<{
      steps?: Array<{
        distance?: number;
        duration?: number;
        name?: string;
        maneuver?: { instruction?: string; location?: [number, number] };
      }>;
    }>;
  }>;
};

async function fetchMapboxJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "origin",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Mapbox indisponível.");
    }
    return (await response.json()) as T;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

/**
 * Optional traffic-aware routing. It is deliberately not used for private GPS
 * origins: calculatePrivateLocationRoute keeps those coordinates on-device.
 *
 * No token => no network request and the caller continues with the public/free
 * provider chain.
 */
export async function requestOptionalMapboxRoute(
  origin: MapboxCoordinate,
  destination: MapboxCoordinate,
  mode: MapboxTravelMode,
  token = getOptionalMapboxToken()
): Promise<MapboxRouteResult | null> {
  if (!hasOptionalMapboxConfigured(token)) return null;

  const profile = profileFor(mode);
  if (!profile || isOptionalMapboxCoolingDown()) return null;

  const requestKey = [
    profile,
    origin.lat.toFixed(5),
    origin.lng.toFixed(5),
    destination.lat.toFixed(5),
    destination.lng.toFixed(5),
  ].join(":");
  const existing = inFlight.get(requestKey);
  if (existing) return existing;

  const task = (async () => {
  const coordinates =
    origin.lng +
    "," +
    origin.lat +
    ";" +
    destination.lng +
    "," +
    destination.lat;
  const url = new URL(
    DIRECTIONS_BASE + "/" + profile + "/" + coordinates
  );
  url.searchParams.set("alternatives", "true");
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "polyline");
  url.searchParams.set("steps", "true");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("access_token", token);

  const data = await fetchMapboxJson<MapboxDirectionsResponse>(url.toString());
  const route =
    data.routes
      ?.filter(
        item =>
          Number.isFinite(Number(item.distance)) &&
          Number(item.distance) > 0 &&
          Number.isFinite(Number(item.duration)) &&
          Number(item.duration) > 0 &&
          typeof item.geometry === "string" &&
          item.geometry.length > 0
      )
      .sort((a, b) => Number(a.duration) - Number(b.duration))[0] ?? null;

  if (data.code !== "Ok" || !route) return null;

  const steps = (route.legs ?? []).flatMap(leg => (leg.steps ?? []).flatMap(step => {
    const instruction = step.maneuver?.instruction?.trim();
    if (!instruction) return [];
    return [{
      instruction,
      streetName: step.name?.trim() || undefined,
      distanceMeters: Number(step.distance) || 0,
      durationSeconds: Number(step.duration) || 0,
      location: Array.isArray(step.maneuver?.location) && step.maneuver.location.length === 2
        ? { lng: Number(step.maneuver.location[0]), lat: Number(step.maneuver.location[1]) }
        : undefined,
    }];
  }));

  return {
    distanceMeters: Number(route.distance),
    durationSeconds: Number(route.duration),
    polyline: route.geometry as string,
    ...(steps.length ? { steps } : {}),
  };
  })().catch(error => {
    unavailableUntil = Date.now() + FAILURE_COOLDOWN_MS;
    throw error;
  });

  inFlight.set(requestKey, task);
  const cleanup = () => {
    if (inFlight.get(requestKey) === task) inFlight.delete(requestKey);
  };
  void task.then(cleanup, cleanup);
  return task;
}
