import { searchAguasLindasStations } from "@/lib/aguasLindasStations";

const NOMINATIM_URL = import.meta.env.VITE_PUBLIC_GEOCODER_URL?.trim() || "https://nominatim.openstreetmap.org/search";
const OSRM_URL = import.meta.env.VITE_PUBLIC_ROUTING_URL?.trim() || "https://router.project-osrm.org/route/v1/driving";
const CACHE_PREFIX = "trajeto:public-routing:";
const REQUEST_TIMEOUT_MS = 9_000;

export type PublicCoordinate = { lat: number; lng: number };
export type PublicRouteSource = "osrm" | "local-estimate";
export type PublicTravelMode = "driving" | "walking" | "cycling" | "transit";
export type PublicRoute = {
  origin: PublicCoordinate;
  destination: PublicCoordinate;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
  source: PublicRouteSource;
  mode: PublicTravelMode;
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

function normalizeSearch(value: string) {
  return normalizeText(value)
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Serviço de rota indisponível.");
    return await response.json() as T;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function cacheGet<T>(key: string): T | null {
  for (const storage of [globalThis.localStorage, globalThis.sessionStorage]) {
    try {
      const raw = storage?.getItem(CACHE_PREFIX + key);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
  }
  return null;
}

function cacheSet<T>(key: string, value: T) {
  for (const storage of [globalThis.localStorage, globalThis.sessionStorage]) {
    try {
      storage?.setItem(CACHE_PREFIX + key, JSON.stringify(value));
    } catch {}
  }
}

function haversineMeters(a: PublicCoordinate, b: PublicCoordinate) {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthMeters = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthMeters * Math.asin(Math.sqrt(h));
}

function encodePolyline(points: PublicCoordinate[]) {
  let lastLat = 0;
  let lastLng = 0;
  let encoded = "";
  const encodeValue = (value: number) => {
    let next = value < 0 ? ~(value << 1) : value << 1;
    let chunk = "";
    while (next >= 0x20) {
      chunk += String.fromCharCode((0x20 | (next & 0x1f)) + 63);
      next >>= 5;
    }
    chunk += String.fromCharCode(next + 63);
    return chunk;
  };

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    encoded += encodeValue(lat - lastLat) + encodeValue(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return encoded;
}

function localGeocode(value: string): PublicCoordinate | null {
  const normalized = normalizeSearch(value);
  if (!normalized) return null;

  if (
    normalized === "aguas lindas" ||
    normalized === "aguas lindas de goias" ||
    normalized.includes("aguas lindas de goias go") ||
    normalized.includes("aguas lindas go")
  ) {
    return { lat: -15.7545, lng: -48.2816 };
  }

  const matches = searchAguasLindasStations(value);
  const withCoordinates = matches.filter(station => Number.isFinite(station.anp?.latitude) && Number.isFinite(station.anp?.longitude));
  const exact = withCoordinates.filter(station => {
    const stationText = normalizeSearch([
      station.displayName,
      station.legalName,
      station.address,
      station.neighborhood,
      ...station.aliases,
    ].filter(Boolean).join(" "));
    return stationText === normalized || stationText.includes(normalized) || normalized.includes(stationText);
  });

  const unique = exact.length === 1 ? exact[0] : null;
  if (!unique) return null;

  return {
    lat: Number(unique.anp?.latitude),
    lng: Number(unique.anp?.longitude),
  };
}

async function geocode(value: string): Promise<PublicCoordinate> {
  const parsedCoordinate = parseCoordinateInput(value);
  if (parsedCoordinate) return parsedCoordinate;

  const query = normalizeText(value);
  if (!query) throw new Error("Origem ou destino vazio.");

  const cacheKey = "geocode:" + query.toLocaleLowerCase("pt-BR");
  const cached = cacheGet<PublicCoordinate>(cacheKey);
  if (cached) return cached;

  const local = localGeocode(query);
  if (local) {
    cacheSet(cacheKey, local);
    return local;
  }

  const request = async (q: string) => {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("accept-language", "pt-BR");
    return fetchJson<NominatimResult[]>(url.toString());
  };

  let results: NominatimResult[] = [];
  try {
    results = await request(query);
  } catch {
    results = [];
  }

  let result = results[0];
  if (!result?.lat || !result.lon) {
    try {
      results = await request(query + ", Águas Lindas de Goiás, Goiás, Brasil");
      result = results[0];
    } catch {}
  }

  const lat = Number(result?.lat);
  const lng = Number(result?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const fallback = localGeocode(query);
    if (fallback) {
      cacheSet(cacheKey, fallback);
      return fallback;
    }
    throw new Error("Não foi possível localizar “" + query + "”. Tente usar endereço completo, cidade ou coordenadas.");
  }

  const geocodedCoordinate = { lat, lng };
  cacheSet(cacheKey, geocodedCoordinate);
  return geocodedCoordinate;
}

function buildLocalEstimate(origin: PublicCoordinate, destination: PublicCoordinate, mode: PublicTravelMode): PublicRoute {
  const directDistance = haversineMeters(origin, destination);
  const distanceMeters = Math.max(200, directDistance * 1.18);
  const directKm = directDistance / 1000;
  const speedKmh = mode === "walking" ? 5 : mode === "cycling" ? 17 : mode === "transit" ? 28 : directKm <= 20 ? 38 : directKm <= 80 ? 58 : 72;
  const durationSeconds = Math.max(60, (distanceMeters / 1000 / speedKmh) * 3600);

  return {
    origin,
    destination,
    distanceMeters,
    durationSeconds,
    polyline: encodePolyline([origin, destination]),
    source: "local-estimate",
    mode,
  };
}

export async function calculatePublicRoute(originText: string, destinationText: string, mode: PublicTravelMode = "driving"): Promise<PublicRoute> {
  const origin = await geocode(originText);
  const destination = await geocode(destinationText);
  const coordinateKey = [
    origin.lat.toFixed(5),
    origin.lng.toFixed(5),
    destination.lat.toFixed(5),
    destination.lng.toFixed(5),
  ].join(",") + ":" + mode;

  const cached = cacheGet<PublicRoute>("route:" + coordinateKey);
  if (cached) return cached;

  const profile = mode === "walking" ? "foot" : mode === "cycling" ? "bike" : "driving";
  const routingBase = OSRM_URL.replace(/\/route\/v1\/[^/]+$/, "/route/v1/" + profile);
  const url = routingBase + "/" +
    origin.lng + "," + origin.lat + ";" +
    destination.lng + "," + destination.lat +
    "?alternatives=false&overview=full&geometries=polyline";

  try {
    const data = await fetchJson<OsrmResponse>(url);
    const route = data.routes?.[0];
    const distanceMeters = route?.distance;
    const durationSeconds = route?.duration;
    const polyline = route?.geometry;

    if (data.code === "Ok" && Number.isFinite(distanceMeters) && Number.isFinite(durationSeconds) && typeof polyline === "string") {
      const result: PublicRoute = {
        origin,
        destination,
        distanceMeters: Number(distanceMeters),
        durationSeconds: Number(durationSeconds),
        polyline,
        source: "osrm",
        mode,
      };
      cacheSet("route:" + coordinateKey, result);
      return result;
    }
  } catch {
    // A local estimate keeps the public site usable when the shared routing
    // service is throttled, unavailable, or the device is offline.
  }

  const estimated = buildLocalEstimate(origin, destination, mode);
  cacheSet("route:" + coordinateKey, estimated);
  return estimated;
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
  const estimated = result.source === "local-estimate";
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
      summary: estimated
        ? "Estimativa local baseada nas coordenadas disponíveis para o modo selecionado."
        : "Rota viária calculada com OpenStreetMap/OSRM.",
      source: result.source,
      mode: result.mode,
    },
    stops: [],
    priceCoverage: 0,
    anpReferences: [],
    traffic: {
      label: estimated ? "Estimativa local" : "Trânsito ao vivo não disponível",
      detail: estimated
        ? "A rede viária pública não respondeu. Distância e tempo são uma estimativa e o navegador externo deve ser usado para navegação atualizada."
        : "A rota informa distância e duração da rede viária pública; trânsito ao vivo fica para o navegador externo.",
    },
    economy: null,
    recommendation: null,
    recommendationDiagnostics: {
      requestedCandidates: 0,
      realDetoursCalculated: 0,
    },
  };
}
