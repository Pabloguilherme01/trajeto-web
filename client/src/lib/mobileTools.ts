import { privateOriginForExternalNavigation, privateRouteShareOrigin } from "@/lib/locationPrivacy";
import { getNavigationPreferences, setNavigationProvider, type NavigationPreference, type NavigationProvider } from "@/lib/navigationPreferences";
export type { NavigationProvider } from "@/lib/navigationPreferences";

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export type RouteShareDecision = {
  name: string;
  price?: number | null;
  detourKm?: number | null;
  detourSource?: "real" | "estimated";
};

export function buildRouteShareText(origin: string, destination: string, decision?: RouteShareDecision | null) {
  const route = `Planejei esta rota no Trajeto: ${privateRouteShareOrigin(origin)} → ${destination.trim()}.`;
  if (!decision?.name) return route + " Veja distância, duração e opções de abastecimento.";

  const priceValue = Number(decision.price);
  const price = Number.isFinite(priceValue) && priceValue > 0
    ? ` · referência de ${priceValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00A0/g, " ")}/L`
    : "";
  const detourValue = Number(decision.detourKm);
  const detour = Number.isFinite(detourValue) && detourValue >= 0
    ? ` · desvio ${decision.detourSource === "real" ? "real" : "estimado"} de ${detourValue.toLocaleString("pt-BR")} km`
    : "";

  return route + ` Parada sugerida: ${decision.name}${price}${detour}.`;
}

export async function shareText(text: string, url: string, title = "Trajeto") {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text + "\n" + url);
    return;
  }

  throw new Error("Compartilhamento indisponível neste navegador.");
}

export function buildNearbyStationsUrl(basePath: string, lat?: number, lng?: number) {
  const params = new URLSearchParams({ q: "postos" });
  if (Number.isFinite(lat) && Number.isFinite(lng)) params.set("perto", "1");
  return basePath + "?" + params.toString();
}

export type GoogleMapsTravelMode = "driving" | "walking" | "bicycling" | "transit" | "two-wheeler";

export function buildGoogleMapsDirectionsUrl(
  origin: string,
  destination: string,
  travelMode: GoogleMapsTravelMode = "driving",
  navigate = false,
) {
  const normalizedOrigin = privateOriginForExternalNavigation(origin);
  const normalizedDestination = destination.trim();
  const params = new URLSearchParams({ api: "1" });
  if (normalizedOrigin) params.set("origin", normalizedOrigin);
  params.set("destination", normalizedDestination);
  params.set("travelmode", travelMode);
  if (navigate) params.set("dir_action", "navigate");
  return "https://www.google.com/maps/dir/?" + params.toString();
}

export function buildGoogleMapsMultiStopUrl(
  destination: string,
  waypoints: string[],
  navigate = true,
  preference: RoutePreference = "default",
) {
  const normalizedWaypoints = waypoints.map(item => item.trim()).filter(Boolean).slice(0, 3);
  const params = new URLSearchParams({
    api: "1",
    destination: destination.trim(),
    travelmode: "driving",
  });
  if (normalizedWaypoints.length) params.set("waypoints", normalizedWaypoints.join("|"));
  if (navigate) params.set("dir_action", "navigate");
  if (preference === "avoid-tolls") params.set("avoid", "tolls");
  if (preference === "avoid-highways") params.set("avoid", "highways");
  return "https://www.google.com/maps/dir/?" + params.toString();
}

export function buildGoogleMapsDestinationUrl(destination: string, navigate = false, placeId?: string) {
  const normalizedDestination = destination.trim();
  const params = new URLSearchParams({
    api: "1",
    destination: normalizedDestination,
    travelmode: "driving",
  });
  if (placeId?.trim()) params.set("destination_place_id", placeId.trim());
  if (navigate) params.set("dir_action", "navigate");
  return "https://www.google.com/maps/dir/?" + params.toString();
}

export function buildGoogleMapsSearchUrl(query: string) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query.trim());
}

export function buildGoogleMapsNearbyStationsUrl(_lat: number, _lng: number) {
  return buildGoogleMapsSearchUrl("postos de combustível perto de mim");
}

export function buildWazeNavigationUrl(destination: string, coordinates?: { lat: number; lng: number }) {
  const params = new URLSearchParams({ navigate: "yes" });
  if (coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)) {
    params.set("ll", `${coordinates.lat},${coordinates.lng}`);
    params.set("zoom", "17");
  } else {
    params.set("q", destination.trim());
  }
  return "https://waze.com/ul?" + params.toString();
}

export type RoutePreference = NavigationPreference;

export function buildAppleMapsDirectionsUrl(
  destination: string,
  origin?: string,
  preference: RoutePreference = "default",
  waypoints: string[] = [],
) {
  const params = new URLSearchParams({ destination: destination.trim(), mode: "driving" });
  const normalizedOrigin = privateOriginForExternalNavigation(origin ?? "");
  if (normalizedOrigin) params.set("source", normalizedOrigin);
  if (preference === "avoid-tolls") params.set("avoid", "tolls");
  if (preference === "avoid-highways") params.set("avoid", "highways");
  const normalizedWaypoints = waypoints.map(item => item.trim()).filter(Boolean).slice(0, 3);
  for (const waypoint of normalizedWaypoints) params.append("waypoint", waypoint);
  return "https://maps.apple.com/directions?" + params.toString();
}

export function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function setPreferredNavigationProvider(provider: NavigationProvider) {
  setNavigationProvider(provider);
}

export function getPreferredNavigationProvider(): NavigationProvider {
  return getNavigationPreferences().provider;
}

export function openNavigation(lat: number, lng: number, label?: string) {
  const encoded = encodeURIComponent(label ?? (lat + "," + lng));
  const google = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng + "&travelmode=driving";
  const waze = "https://www.waze.com/ul?ll=" + lat + "%2C" + lng + "&navigate=yes&zoom=17&q=" + encoded;
  const apple = buildAppleMapsDirectionsUrl(lat + "," + lng);
  return { google, waze, apple };
}

export function vibration(pattern: number | number[] = 12) {
  try { navigator.vibrate?.(pattern); } catch {}
}


export type MobilityProvider = "uber" | "99";

export function buildUberRideUrl(destination: string, coordinates?: { lat: number; lng: number }) {
  const params = new URLSearchParams();
  params.set("pickup", "my_location");
  const drop = {
    ...(coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)
      ? { latitude: coordinates.lat, longitude: coordinates.lng }
      : {}),
    nickname: destination.trim().slice(0, 80),
    formatted_address: destination.trim(),
  };
  params.set("drop[0]", JSON.stringify(drop));
  return "https://m.uber.com/looking?" + params.toString();
}

export function build99MobilityUrl(destination: string) {
  const query = destination.trim();
  void query;
  return "https://99app.com/";
}

export function buildMobilityLinks(destination: string, coordinates?: { lat: number; lng: number }) {
  return {
    uber: buildUberRideUrl(destination, coordinates),
    nineNine: build99MobilityUrl(destination),
  };
}
