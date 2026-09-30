const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const CACHE_PREFIX = "trajeto:public-routing:";
const REQUEST_TIMEOUT_MS = 9_000;

export type PublicCoordinate = { lat: number; lng: number };
export type PublicRoute = {
  origin: PublicCoordinate;
  destination: PublicCoordinate;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

type OsrmResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: string;
  }>;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseCoordinateInput(value: string): PublicCoordinate | null {
  const match = normalizeText(value).match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Serviço de rota indisponível.");
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function cacheSet<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

async function geocode(value: string): Promise<PublicCoordinate> {
  const parsedCoordinate = parseCoordinateInput(value);
  if (parsedCoordinate) return parsedCoordinate;

  const query = normalizeText(value);
  if (!query) throw new Error("Origem ou destino vazio.");

  const cacheKey = "geocode:" + query.toLocaleLowerCase("pt-BR");
  const cached = cacheGet<PublicCoordinate>(cacheKey);
  if (cached) return cached;

  const primary = new URL(NOMINATIM_URL);
  primary.searchParams.set("q", query);
  primary.searchParams.set("format", "jsonv2");
  primary.searchParams.set("limit", "1");
  primary.searchParams.set("countrycodes", "br");
  primary.searchParams.set("accept-language", "pt-BR");

  const first = await fetchJson<NominatimResult[]>(primary.toString());
  let result = first[0];

  if (!result?.lat || !result.lon) {
    const fallback = new URL(NOMINATIM_URL);
    fallback.searchParams.set("q", query + ", Águas Lindas de Goiás, Goiás, Brasil");
    fallback.searchParams.set("format", "jsonv2");
    fallback.searchParams.set("limit", "1");
    fallback.searchParams.set("countrycodes", "br");
    fallback.searchParams.set("accept-language", "pt-BR");
    const second = await fetchJson<NominatimResult[]>(fallback.toString());
    result = second[0];
  }

  const lat = Number(result?.lat);
  const lng = Number(result?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Não foi possível localizar “" + query + "”. Tente usar endereço completo, cidade ou coordenadas.");
  }

  const geocodedCoordinate = { lat, lng };
  cacheSet(cacheKey, geocodedCoordinate);
  return geocodedCoordinate;
}

export async function calculatePublicRoute(originText: string, destinationText: string): Promise<PublicRoute> {
  const origin = await geocode(originText);
  const destination = await geocode(destinationText);
  const coordinateKey = [
    origin.lat.toFixed(5),
    origin.lng.toFixed(5),
    destination.lat.toFixed(5),
    destination.lng.toFixed(5),
  ].join(",");

  const cached = cacheGet<PublicRoute>("route:" + coordinateKey);
  if (cached) return cached;

  const url = OSRM_URL + "/" +
    origin.lng + "," + origin.lat + ";" +
    destination.lng + "," + destination.lat +
    "?alternatives=false&overview=full&geometries=polyline";

  const data = await fetchJson<OsrmResponse>(url);
  const route = data.routes?.[0];
  const distanceMeters = route?.distance;
  const durationSeconds = route?.duration;
  const polyline = route?.geometry;
  if (data.code !== "Ok" || !Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds) || typeof polyline !== "string") {
    throw new Error("Não foi possível calcular uma rota para estes pontos.");
  }

  const safeDistanceMeters = Number(distanceMeters);
  const safeDurationSeconds = Number(durationSeconds);
  const result: PublicRoute = {
    origin,
    destination,
    distanceMeters: safeDistanceMeters,
    durationSeconds: safeDurationSeconds,
    polyline,
  };
  cacheSet("route:" + coordinateKey, result);
  return result;
}


function publicDistanceLabel(meters: number) {
  return meters >= 1000
    ? (meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km"
    : Math.round(meters).toLocaleString("pt-BR") + " m";
}

function publicDurationLabel(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? hours + "h " + rest + "min" : hours + "h";
  }
  return minutes + " min";
}

export function buildPublicRoutePayload(result: PublicRoute) {
  return {
    searchId: null,
    route: {
      origin: result.origin,
      destination: result.destination,
      distanceMeters: result.distanceMeters,
      distanceLabel: publicDistanceLabel(result.distanceMeters),
      durationSeconds: result.durationSeconds,
      durationLabel: publicDurationLabel(result.durationSeconds),
      polyline: result.polyline,
      summary: "Rota pública calculada com OpenStreetMap/OSRM.",
    },
    stops: [],
    priceCoverage: 0,
    anpReferences: [],
    traffic: {
      label: "Trânsito ao vivo não disponível",
      detail: "A rota pública informa distância e duração da rede viária; trânsito ao vivo fica para o navegador externo.",
    },
    economy: null,
    recommendation: null,
    recommendationDiagnostics: {
      requestedCandidates: 0,
      realDetoursCalculated: 0,
    },
  };
}
