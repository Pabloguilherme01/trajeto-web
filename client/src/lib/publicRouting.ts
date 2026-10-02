import { searchAguasLindasStations } from "@/lib/aguasLindasStations";
import { LOCAL_PLACES } from "@/lib/localPlaces";
import { PUBLIC_SERVICES } from "@/lib/publicServices";
import { groupAnpFuelRows } from "@shared/anpRevendedores";
import { getOfflineAnpSnapshot } from "@/lib/stationMapOffline";
import { resolveLocalGeocodePoint } from "@/lib/localGeocoding";
import { requestOptionalMapboxRoute } from "@/lib/mapboxOptional";

const NOMINATIM_URL =
  import.meta.env.VITE_PUBLIC_GEOCODER_URL?.trim() ||
  "https://nominatim.openstreetmap.org/search";
const OSRM_URL =
  import.meta.env.VITE_PUBLIC_ROUTING_URL?.trim() ||
  "https://router.project-osrm.org/route/v1/driving";
const CACHE_PREFIX = "trajeto:public-routing:";
const REQUEST_TIMEOUT_MS = 9_000;
const GEOCODER_MIN_INTERVAL_MS = import.meta.env.MODE === "test" ? 0 : 1_100;
const GEOCODER_MISS_TTL_MS = 60_000;
const GEOCODER_FAILURE_COOLDOWN_MS = 120_000;
const GEOCODER_COOLDOWN_KEY = CACHE_PREFIX + "geocoder-unavailable-until";
const ROUTER_FAILURE_COOLDOWN_MS = 60_000;
const ROUTER_COOLDOWN_KEY = CACHE_PREFIX + "router-unavailable-until";
const geocoderInFlight = new Map<string, Promise<NominatimResult | undefined>>();
const routerInFlight = new Map<string, Promise<PublicRoute>>();
const geocoderMissUntil = new Map<string, number>();
let geocoderQueue: Promise<void> = Promise.resolve();
let geocoderLastStartedAt = 0;
let geocoderUnavailableUntilFallback = 0;
let routerUnavailableUntilFallback = 0;

export type PublicCoordinate = { lat: number; lng: number };
export type PublicRouteSource = "mapbox" | "osrm" | "local-estimate";
export type PublicTravelMode = "driving" | "walking" | "cycling" | "transit";
export type PublicRouteStep = {
  instruction: string;
  streetName?: string;
  distanceMeters: number;
  durationSeconds: number;
};

export type PublicRoute = {
  origin: PublicCoordinate;
  destination: PublicCoordinate;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
  source: PublicRouteSource;
  mode: PublicTravelMode;
  steps?: PublicRouteStep[];
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
    legs?: Array<{
      steps?: Array<{
        distance?: number;
        duration?: number;
        name?: string;
        maneuver?: { type?: string; modifier?: string };
      }>;
    }>;
  }>;
};


function osrmInstruction(step: { name?: string; maneuver?: { type?: string; modifier?: string } }) {
  const street = step.name?.trim();
  const target = street ? " na " + street : "";
  const type = step.maneuver?.type;
  const modifier = step.maneuver?.modifier;
  if (type === "depart") return street ? "Saia pela " + street : "Inicie o trajeto";
  if (type === "arrive") return "Chegue ao destino";
  if (type === "roundabout" || type === "rotary") return "Entre na rotatória" + target;
  if (modifier === "left" || modifier === "slight left" || modifier === "sharp left") return "Vire à esquerda" + target;
  if (modifier === "right" || modifier === "slight right" || modifier === "sharp right") return "Vire à direita" + target;
  if (modifier === "straight") return street ? "Siga pela " + street : "Siga em frente";
  return street ? "Continue pela " + street : "Continue no trajeto";
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeSearch(value: string) {
  return normalizeText(value)
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function opaqueCacheToken(value: string) {
  let first = 2166136261;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 2246822519);
  }
  return (
    (first >>> 0).toString(16).padStart(8, "0") +
    (second >>> 0).toString(16).padStart(8, "0")
  );
}

function geocodeCacheKey(value: string) {
  // This token is not a secret or an authentication hash. Its purpose is to
  // keep the user's typed address out of browser-storage key names.
  return "geocode:" + opaqueCacheToken(normalizeSearch(value));
}

function getGeocoderSessionStorage() {
  try {
    if (typeof window !== "undefined") return window.sessionStorage;
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {}
  return undefined;
}

function getGeocoderUnavailableUntil() {
  const storage = getGeocoderSessionStorage();
  if (!storage) return geocoderUnavailableUntilFallback;
  try {
    const raw = storage.getItem(GEOCODER_COOLDOWN_KEY);
    if (raw == null) {
      geocoderUnavailableUntilFallback = 0;
      return 0;
    }
    const value = Number(raw);
    geocoderUnavailableUntilFallback =
      Number.isFinite(value) && value > 0 ? value : 0;
    return geocoderUnavailableUntilFallback;
  } catch {
    return geocoderUnavailableUntilFallback;
  }
}

function setGeocoderUnavailableUntil(value: number) {
  geocoderUnavailableUntilFallback = value > 0 ? value : 0;
  const storage = getGeocoderSessionStorage();
  if (!storage) return;
  try {
    if (value > 0) storage.setItem(GEOCODER_COOLDOWN_KEY, String(value));
    else storage.removeItem(GEOCODER_COOLDOWN_KEY);
  } catch {}
}

function getRouterUnavailableUntil() {
  const storage = getGeocoderSessionStorage();
  if (!storage) return routerUnavailableUntilFallback;
  try {
    const raw = storage.getItem(ROUTER_COOLDOWN_KEY);
    if (raw == null) {
      routerUnavailableUntilFallback = 0;
      return 0;
    }
    const value = Number(raw);
    routerUnavailableUntilFallback =
      Number.isFinite(value) && value > 0 ? value : 0;
    return routerUnavailableUntilFallback;
  } catch {
    return routerUnavailableUntilFallback;
  }
}

function setRouterUnavailableUntil(value: number) {
  routerUnavailableUntilFallback = value > 0 ? value : 0;
  const storage = getGeocoderSessionStorage();
  if (!storage) return;
  try {
    if (value > 0) storage.setItem(ROUTER_COOLDOWN_KEY, String(value));
    else storage.removeItem(ROUTER_COOLDOWN_KEY);
  } catch {}
}

export function resetPublicRoutingTestState() {
  if (import.meta.env.MODE !== "test") return;
  geocoderUnavailableUntilFallback = 0;
  routerUnavailableUntilFallback = 0;
  geocoderMissUntil.clear();
  geocoderInFlight.clear();
  routerInFlight.clear();
  geocoderQueue = Promise.resolve();
  geocoderLastStartedAt = 0;
}

function expandLocalQuery(value: string) {
  const normalized = normalizeSearch(value);
  if (!normalized || normalized.length < 3) return value;

  const stationMatches = searchAguasLindasStations(value).filter(station => {
    const names = [
      station.displayName,
      station.legalName,
      ...station.aliases,
    ].map(normalizeSearch).filter(Boolean);
    return names.some(name =>
      name === normalized ||
      normalized.startsWith(name + " ") ||
      normalized.includes(name + " ")
    );
  });
  if (stationMatches.length === 1) {
    const station = stationMatches[0];
    if (
      Number.isFinite(station.anp?.latitude) &&
      Number.isFinite(station.anp?.longitude)
    ) {
      return String(station.anp?.latitude) + "," + String(station.anp?.longitude);
    }
    if (station.address) {
      return [
        station.address,
        station.neighborhood,
        "Águas Lindas de Goiás",
        "GO",
        "Brasil",
      ].filter(Boolean).join(", ");
    }
  }

  const serviceMatches = PUBLIC_SERVICES.filter(service => {
    const name = normalizeSearch(service.name);
    const haystack = normalizeSearch(
      [service.name, service.address, service.mapQuery, ...(service.keywords ?? [])]
        .filter(Boolean)
        .join(" ")
    );
    return (
      name === normalized ||
      name.includes(normalized) ||
      normalized.includes(name) ||
      haystack === normalized
    );
  });
  if (serviceMatches.length === 1) {
    const service = serviceMatches[0];
    return service.mapQuery || service.address || service.name;
  }

  const placeMatches = LOCAL_PLACES.filter(place => {
    const name = normalizeSearch(place.name);
    const haystack = normalizeSearch(
      [place.name, place.address, place.mapQuery, ...(place.tags ?? [])]
        .filter(Boolean)
        .join(" ")
    );
    return (
      name === normalized ||
      name.includes(normalized) ||
      normalized.includes(name) ||
      haystack === normalized
    );
  });
  if (placeMatches.length === 1) {
    const place = placeMatches[0];
    return place.mapQuery || place.address || place.name;
  }

  return value;
}

function parseCoordinateInput(value: string): PublicCoordinate | null {
  const match = normalizeText(value).match(
    /^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/
  );
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return null;
  return { lat, lng };
}

async function fetchJson<T>(url: string): Promise<T> {
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
    if (!response.ok) throw new Error("Serviço de rota indisponível.");
    return (await response.json()) as T;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function publicGeocoderWaitMs(
  lastStartedAt: number,
  now: number,
  minIntervalMs = 1_100
) {
  if (!Number.isFinite(lastStartedAt) || lastStartedAt <= 0) return 0;
  return Math.max(0, minIntervalMs - Math.max(0, now - lastStartedAt));
}

async function requestPublicGeocoder(query: string) {
  const key = normalizeSearch(query);
  const now = Date.now();
  if (getGeocoderUnavailableUntil() > now) return undefined;
  if ((geocoderMissUntil.get(key) ?? 0) > now) return undefined;

  const existing = geocoderInFlight.get(key);
  if (existing) return existing;

  const task = geocoderQueue.then(async () => {
    const waitMs = publicGeocoderWaitMs(
      geocoderLastStartedAt,
      Date.now(),
      GEOCODER_MIN_INTERVAL_MS
    );
    if (waitMs > 0) {
      await new Promise<void>(resolve => globalThis.setTimeout(resolve, waitMs));
    }
    geocoderLastStartedAt = Date.now();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("accept-language", "pt-BR");

    try {
      const results = await fetchJson<NominatimResult[]>(url.toString());
      const result = results[0];
      if (!result?.lat || !result.lon) {
        geocoderMissUntil.set(key, Date.now() + GEOCODER_MISS_TTL_MS);
        return undefined;
      }
      geocoderMissUntil.delete(key);
      setGeocoderUnavailableUntil(0);
      return result;
    } catch (error) {
      const failedAt = Date.now();
      geocoderMissUntil.set(key, failedAt + GEOCODER_MISS_TTL_MS);
      setGeocoderUnavailableUntil(failedAt + GEOCODER_FAILURE_COOLDOWN_MS);
      throw error;
    }
  });

  geocoderInFlight.set(key, task);
  geocoderQueue = task.then(() => undefined, () => undefined);
  const cleanup = () => {
    if (geocoderInFlight.get(key) === task) geocoderInFlight.delete(key);
  };
  void task.then(cleanup, cleanup);
  return task;
}

function isCoordinate(value: unknown): value is PublicCoordinate {
  if (!value || typeof value !== "object") return false;
  const point = value as PublicCoordinate;
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}

function isPublicRoute(value: unknown): value is PublicRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as PublicRoute;
  return (
    isCoordinate(route.origin) &&
    isCoordinate(route.destination) &&
    Number.isFinite(route.distanceMeters) &&
    route.distanceMeters > 0 &&
    Number.isFinite(route.durationSeconds) &&
    route.durationSeconds > 0 &&
    typeof route.polyline === "string" &&
    route.polyline.length > 0 &&
    ["mapbox", "osrm", "local-estimate"].includes(route.source) &&
    ["driving", "walking", "cycling", "transit"].includes(route.mode)
  );
}

function cacheGet<T>(key: string): T | null {
  for (const name of ["sessionStorage"] as const) {
    try {
      const storage = globalThis[name];
      const raw = storage?.getItem(CACHE_PREFIX + key);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
  }
  return null;
}

function cacheSet<T>(key: string, value: T) {
  // Routing/geocoding results can reveal places a person searched for.
  // Keep them session-scoped so another user of the same browser profile
  // cannot inherit a previous person's location-derived cache.
  for (const name of ["sessionStorage"] as const) {
    try {
      const storage = globalThis[name];
      storage?.setItem(CACHE_PREFIX + key, JSON.stringify(value));
    } catch {}
  }
}

function haversineMeters(a: PublicCoordinate, b: PublicCoordinate) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMeters = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
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

  const preparedPoint = resolveLocalGeocodePoint(value);
  if (preparedPoint) return preparedPoint;

  // A city-qualified street, hospital or station is never the city centre.
  const cityName = normalized.replace(/[,;]/g, " ").replace(/\s+/g, " ").trim();
  if (
    [
      "aguas lindas",
      "aguas lindas go",
      "aguas lindas de goias",
      "aguas lindas de goias go",
    ].includes(cityName)
  ) {
    return { lat: -15.7545, lng: -48.2816 };
  }

  const snapshotMatches = groupAnpFuelRows(getOfflineAnpSnapshot().rows).filter(row => {
    if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude))
      return false;
    const rowText = normalizeSearch(
      [
        row.cnpj,
        row.razaoSocial,
        row.endereco,
        row.bairro,
        row.municipio,
      ]
        .filter(Boolean)
        .join(" ")
    );
    return (
      rowText === normalized ||
      rowText.includes(normalized) ||
      normalized.includes(normalizeSearch(row.razaoSocial || ""))
    );
  });
  if (snapshotMatches.length === 1) {
    return {
      lat: Number(snapshotMatches[0].latitude),
      lng: Number(snapshotMatches[0].longitude),
    };
  }

  const matches = searchAguasLindasStations(value);
  const withCoordinates = matches.filter(
    station =>
      Number.isFinite(station.anp?.latitude) &&
      Number.isFinite(station.anp?.longitude)
  );
  const exact = withCoordinates.filter(station => {
    const stationText = normalizeSearch(
      [
        station.displayName,
        station.legalName,
        station.address,
        station.neighborhood,
        ...station.aliases,
      ]
        .filter(Boolean)
        .join(" ")
    );
    return (
      stationText === normalized ||
      stationText.includes(normalized) ||
      normalized.includes(stationText)
    );
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

  const cacheKey = geocodeCacheKey(query);
  const cached = cacheGet<PublicCoordinate>(cacheKey);
  if (isCoordinate(cached)) return cached;

  const local = localGeocode(query);
  if (local) {
    cacheSet(cacheKey, local);
    return local;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error(
      "Esse local ainda não está disponível offline. Conecte-se uma vez para preparar o endereço ou use um destino salvo."
    );
  }

  const expanded = expandLocalQuery(query);
  const expandedCoordinate = parseCoordinateInput(expanded);
  if (expandedCoordinate) {
    cacheSet(cacheKey, expandedCoordinate);
    return expandedCoordinate;
  }
  const expandedLocal = localGeocode(expanded);
  if (expandedLocal) {
    cacheSet(cacheKey, expandedLocal);
    return expandedLocal;
  }
  let result: NominatimResult | undefined;
  try {
    // One user action performs at most one public geocoder request. Known
    // services/places are expanded locally first; unknown destinations should
    // be entered with enough address context instead of generating retries.
    result = await requestPublicGeocoder(expanded);
  } catch {
    result = undefined;
  }

  const lat = Number(result?.lat);
  const lng = Number(result?.lon);
  if (!isCoordinate({ lat, lng })) {
    const fallback = localGeocode(query);
    if (fallback) {
      cacheSet(cacheKey, fallback);
      return fallback;
    }
    throw new Error(
      "Não foi possível localizar “" +
        query +
        "”. Tente usar endereço completo, cidade ou coordenadas."
    );
  }

  const geocodedCoordinate = { lat, lng };
  cacheSet(cacheKey, geocodedCoordinate);
  const expandedKey = geocodeCacheKey(expanded);
  if (expandedKey !== cacheKey) cacheSet(expandedKey, geocodedCoordinate);
  return geocodedCoordinate;
}

function corridorDistanceKm(
  point: PublicCoordinate,
  origin: PublicCoordinate,
  destination: PublicCoordinate
) {
  const dx = destination.lng - origin.lng;
  const dy = destination.lat - origin.lat;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.lng - origin.lng) * dx + (point.lat - origin.lat) * dy) /
              length2
          )
        );
  const closest = { lat: origin.lat + dy * t, lng: origin.lng + dx * t };
  return {
    distanceKm: haversineMeters(point, closest) / 1000,
    progress: t,
  };
}

function findLocalRouteStops(
  origin: PublicCoordinate,
  destination: PublicCoordinate
) {
  return searchAguasLindasStations("postos")
    .map(station => {
      const lat = Number(station.anp?.latitude);
      const lng = Number(station.anp?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const corridor = corridorDistanceKm({ lat, lng }, origin, destination);
      return {
        placeId: "local:" + station.id,
        name: station.displayName || station.legalName || "Posto",
        address:
          station.address || station.neighborhood || "Águas Lindas de Goiás",
        lat,
        lng,
        corridorKm: corridor.distanceKm,
        progress: corridor.progress,
        isOpen:
          station.mapData?.operationalStatus === "open"
            ? true
            : station.mapData?.operationalStatus === "closed"
              ? false
              : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter(
      item =>
        item.corridorKm <= 4 && item.progress > 0.03 && item.progress < 0.97
    )
    .sort((a, b) => a.corridorKm - b.corridorKm || a.progress - b.progress)
    .slice(0, 6)
    .map(({ corridorKm: _corridorKm, progress: _progress, ...stop }) => stop);
}

function buildLocalEstimate(
  origin: PublicCoordinate,
  destination: PublicCoordinate,
  mode: PublicTravelMode
): PublicRoute {
  const directDistance = haversineMeters(origin, destination);
  const distanceMeters = Math.max(200, directDistance * 1.18);
  const directKm = directDistance / 1000;
  const speedKmh =
    mode === "walking"
      ? 5
      : mode === "cycling"
        ? 17
        : mode === "transit"
          ? 28
          : directKm <= 20
            ? 38
            : directKm <= 80
              ? 58
              : 72;
  const durationSeconds = Math.max(
    60,
    (distanceMeters / 1000 / speedKmh) * 3600
  );

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

export async function calculateOfflineRoute(
  originText: string,
  destinationText: string,
  mode: PublicTravelMode = "driving"
): Promise<PublicRoute> {
  const parsedOrigin = parseCoordinateInput(originText);
  const parsedDestination = parseCoordinateInput(destinationText);
  const cachedOrigin = cacheGet<PublicCoordinate>(
    geocodeCacheKey(normalizeText(originText))
  );
  const cachedDestination = cacheGet<PublicCoordinate>(
    geocodeCacheKey(normalizeText(destinationText))
  );
  const originResolved =
    parsedOrigin ??
    localGeocode(originText) ??
    (isCoordinate(cachedOrigin) ? cachedOrigin : null);
  const destination =
    parsedDestination ??
    localGeocode(destinationText) ??
    (isCoordinate(cachedDestination) ? cachedDestination : null);

  if (!originResolved || !destination) {
    throw new Error(
      "Essa rota ainda não está preparada para cálculo totalmente offline. Use uma rota salva ou conecte-se uma vez para preparar os locais."
    );
  }

  const origin = parsedOrigin
    ? {
        lat: Math.round(originResolved.lat * 1000) / 1000,
        lng: Math.round(originResolved.lng * 1000) / 1000,
      }
    : originResolved;

  const cachedRouteKey =
    "route:" +
    [
      origin.lat.toFixed(5),
      origin.lng.toFixed(5),
      destination.lat.toFixed(5),
      destination.lng.toFixed(5),
    ].join(",") +
    ":" +
    mode;
  const cachedRoute = cacheGet<PublicRoute>(cachedRouteKey);
  if (
    isPublicRoute(cachedRoute) &&
    (cachedRoute.source !== "osrm" || mode === "driving") &&
    mode !== "transit" &&
    cachedRoute.mode === mode &&
    Math.abs(cachedRoute.origin.lat - origin.lat) < 0.00002 &&
    Math.abs(cachedRoute.origin.lng - origin.lng) < 0.00002 &&
    Math.abs(cachedRoute.destination.lat - destination.lat) < 0.00002 &&
    Math.abs(cachedRoute.destination.lng - destination.lng) < 0.00002
  ) {
    return cachedRoute;
  }

  if (haversineMeters(origin, destination) < 20) {
    throw new Error(
      "Origem e destino parecem ser o mesmo ponto. Escolha locais diferentes."
    );
  }

  return buildLocalEstimate(origin, destination, mode);
}

export async function calculatePrivateLocationRoute(
  originText: string,
  destinationText: string,
  mode: PublicTravelMode = "driving"
): Promise<PublicRoute> {
  const parsedOrigin = parseCoordinateInput(originText);
  if (!parsedOrigin) {
    throw new Error("A origem privada precisa vir da localização deste aparelho.");
  }

  // Keep the exact GPS fix in memory only. The value used by the local estimate
  // is rounded to roughly a city block before it can reach route state/storage.
  const origin = {
    lat: Math.round(parsedOrigin.lat * 1000) / 1000,
    lng: Math.round(parsedOrigin.lng * 1000) / 1000,
  };
  const destination = await geocode(destinationText);

  if (haversineMeters(origin, destination) < 20) {
    throw new Error("Origem e destino parecem ser o mesmo ponto. Escolha locais diferentes.");
  }

  // Deliberately do not call OSRM here. Only the destination may need
  // geocoding; the user's current location never leaves the device.
  return buildLocalEstimate(origin, destination, mode);
}

export async function calculatePublicRoute(
  originText: string,
  destinationText: string,
  mode: PublicTravelMode = "driving"
): Promise<PublicRoute> {
  const resolvedOrigin = await geocode(originText);
  const destination = await geocode(destinationText);
  if (haversineMeters(resolvedOrigin, destination) < 20) {
    throw new Error("Origem e destino parecem ser o mesmo ponto. Escolha locais diferentes.");
  }

  // Coordinates typed manually can still describe a private starting point.
  // Keep normal addresses untouched, but reduce explicit coordinate origins to
  // neighborhood/block precision before they enter route URLs or cache keys.
  const origin = parseCoordinateInput(originText)
    ? {
        lat: Math.round(resolvedOrigin.lat * 1000) / 1000,
        lng: Math.round(resolvedOrigin.lng * 1000) / 1000,
      }
    : resolvedOrigin;

  // Transit needs timetables and line data; a car graph is not a transit route.
  if (mode === "transit") return buildLocalEstimate(origin, destination, mode);

  const coordinateKey =
    [
      origin.lat.toFixed(5),
      origin.lng.toFixed(5),
      destination.lat.toFixed(5),
      destination.lng.toFixed(5),
    ].join(",") +
    ":" +
    mode;

  const cacheKey = "route:" + coordinateKey;
  const cached = cacheGet<PublicRoute>(cacheKey);
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;
  const cachedMatches =
    isPublicRoute(cached) &&
    (cached.source !== "osrm" || mode === "driving") &&
    cached.mode === mode &&
    Math.abs(cached.origin.lat - origin.lat) < 0.00002 &&
    Math.abs(cached.origin.lng - origin.lng) < 0.00002 &&
    Math.abs(cached.destination.lat - destination.lat) < 0.00002 &&
    Math.abs(cached.destination.lng - destination.lng) < 0.00002;

  if (
    cachedMatches &&
    (cached.source === "mapbox" || cached.source === "osrm" || offline)
  )
    return cached;
  if (offline) return buildLocalEstimate(origin, destination, mode);

  const existing = routerInFlight.get(coordinateKey);
  if (existing) return existing;

  const task = (async () => {
    try {
      const enhanced = await requestOptionalMapboxRoute(
        origin,
        destination,
        mode
      );
      if (enhanced) {
        const result: PublicRoute = {
          origin,
          destination,
          distanceMeters: enhanced.distanceMeters,
          durationSeconds: enhanced.durationSeconds,
          polyline: enhanced.polyline,
          source: "mapbox",
          mode,
          steps: enhanced.steps,
        };
        cacheSet(cacheKey, result);
        return result;
      }
    } catch {
      // Mapbox is optional. A provider failure must never remove the public
      // OSRM/local fallback chain.
    }

    // OSRM profiles are fixed when its graph is prepared. Changing the URL to
    // foot/bike cannot turn the configured car graph into a walking/cycle graph.
    // Mapbox above has explicit profiles; otherwise keep these modes estimated.
    if (mode !== "driving") return buildLocalEstimate(origin, destination, mode);

    const now = Date.now();
    if (getRouterUnavailableUntil() > now) {
      if (cachedMatches) return cached;
      const estimated = buildLocalEstimate(origin, destination, mode);
      cacheSet(cacheKey, estimated);
      return estimated;
    }

    const routingBase = OSRM_URL.replace(
      /\/route\/v1\/[^/]+$/,
      "/route/v1/driving"
    );
    const url =
      routingBase +
      "/" +
      origin.lng +
      "," +
      origin.lat +
      ";" +
      destination.lng +
      "," +
      destination.lat +
      "?alternatives=false&overview=full&geometries=polyline&steps=true";

    try {
      const data = await fetchJson<OsrmResponse>(url);
      const route = data.routes?.[0];
      const distanceMeters = route?.distance;
      const durationSeconds = route?.duration;
      const polyline = route?.geometry;

      if (
        data.code === "Ok" &&
        Number.isFinite(distanceMeters) &&
        Number(distanceMeters) > 0 &&
        Number.isFinite(durationSeconds) &&
        Number(durationSeconds) > 0 &&
        typeof polyline === "string" &&
        polyline.length > 0
      ) {
        setRouterUnavailableUntil(0);
        const result: PublicRoute = {
          origin,
          destination,
          distanceMeters: Number(distanceMeters),
          durationSeconds: Number(durationSeconds),
          polyline,
          source: "osrm",
          mode,
          steps: (route.legs ?? []).flatMap(leg => (leg.steps ?? []).map(step => ({
            instruction: osrmInstruction(step),
            streetName: step.name?.trim() || undefined,
            distanceMeters: Number(step.distance) || 0,
            durationSeconds: Number(step.duration) || 0,
          }))),
        };
        cacheSet(cacheKey, result);
        return result;
      }
    } catch {
      setRouterUnavailableUntil(Date.now() + ROUTER_FAILURE_COOLDOWN_MS);
    }

    const estimated = buildLocalEstimate(origin, destination, mode);
    cacheSet(cacheKey, estimated);
    return estimated;
  })();

  routerInFlight.set(coordinateKey, task);
  const cleanup = () => {
    if (routerInFlight.get(coordinateKey) === task) routerInFlight.delete(coordinateKey);
  };
  void task.then(cleanup, cleanup);
  return task;
}

function publicDistanceLabel(meters: number) {
  return meters >= 1000
    ? (meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) +
        " km"
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
  const mapbox = result.source === "mapbox";
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
        : mapbox
          ? result.mode === "driving"
            ? "Rota Mapbox calculada com perfil de direção sensível ao trânsito disponível."
            : "Rota viária calculada com Mapbox."
          : "Rota viária calculada com OpenStreetMap/OSRM.",
      source: result.source,
      mode: result.mode,
      steps: result.steps ?? [],
    },
    stops: findLocalRouteStops(result.origin, result.destination),
    priceCoverage: 0,
    anpReferences: [],
    traffic: {
      label: estimated
        ? "Estimativa local"
        : mapbox && result.mode === "driving"
          ? "Tempo com trânsito Mapbox"
          : "Trânsito ao vivo não disponível",
      detail: estimated
        ? result.mode === "transit"
          ? "Estimativa de deslocamento sem linhas, horários, espera ou conexões confirmados. Consulte o operador de transporte antes de sair."
          : "Distância e tempo são estimados a partir das coordenadas disponíveis; não confirmam ruas ou caminhos adequados ao modo selecionado. Use a navegação externa para conferir o trajeto atualizado."
        : mapbox && result.mode === "driving"
          ? "O tempo da rota usa o perfil driving-traffic do Mapbox quando essa camada opcional está configurada."
          : mapbox
            ? "A geometria foi calculada pelo Mapbox; o modo selecionado não usa trânsito ao vivo."
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
