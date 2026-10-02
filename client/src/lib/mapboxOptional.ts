export type MapboxCoordinate = { lat: number; lng: number };
export type MapboxTravelMode = "driving" | "walking" | "cycling" | "transit";

export type MapboxRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
};

const DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";
const REQUEST_TIMEOUT_MS = 8_000;

export function getOptionalMapboxToken() {
  return import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.trim() || "";
}

export function hasOptionalMapboxConfigured(
  token = getOptionalMapboxToken()
) {
  return token.startsWith("pk.") && token.length > 8;
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
  if (!profile) return null;

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
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "polyline");
  url.searchParams.set("steps", "false");
  url.searchParams.set("access_token", token);

  const data = await fetchMapboxJson<MapboxDirectionsResponse>(url.toString());
  const route = data.routes?.[0];
  const distanceMeters = Number(route?.distance);
  const durationSeconds = Number(route?.duration);
  const polyline = route?.geometry;

  if (
    data.code !== "Ok" ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters <= 0 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    typeof polyline !== "string" ||
    !polyline
  ) {
    return null;
  }

  return { distanceMeters, durationSeconds, polyline };
}
