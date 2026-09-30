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
  const route = `Planejei esta rota no Trajeto: ${origin.trim()} → ${destination.trim()}.`;
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
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  return basePath + "?" + params.toString();
}

export type GoogleMapsTravelMode = "driving" | "walking" | "bicycling" | "transit" | "two-wheeler";

export function buildGoogleMapsDirectionsUrl(
  origin: string,
  destination: string,
  travelMode: GoogleMapsTravelMode = "driving",
  navigate = false,
) {
  const normalizedOrigin = origin.trim();
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

export function buildGoogleMapsNearbyStationsUrl(lat: number, lng: number) {
  const query = `postos de combustível @${lat},${lng}`;
  return buildGoogleMapsSearchUrl(query);
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

export type RoutePreference = "default" | "avoid-tolls" | "avoid-highways";

export function buildAppleMapsDirectionsUrl(
  destination: string,
  origin?: string,
  preference: RoutePreference = "default",
  waypoints: string[] = [],
) {
  const params = new URLSearchParams({ destination: destination.trim(), mode: "driving" });
  if (origin?.trim()) params.set("source", origin.trim());
  if (preference === "avoid-tolls") params.set("avoid", "tolls");
  if (preference === "avoid-highways") params.set("avoid", "highways");
  const normalizedWaypoints = waypoints.map(item => item.trim()).filter(Boolean).slice(0, 3);
  for (const waypoint of normalizedWaypoints) params.append("waypoint", waypoint);
  return "https://maps.apple.com/directions?" + params.toString();
}

export type NavigationProvider = "google" | "waze" | "apple";

export function setPreferredNavigationProvider(provider: NavigationProvider) {
  try { localStorage.setItem("trajeto:navigation-provider", provider); } catch {}
}

export function getPreferredNavigationProvider(): NavigationProvider {
  try {
    const value = localStorage.getItem("trajeto:navigation-provider");
    if (value === "waze" || value === "apple" || value === "google") return value;
  } catch {}
  return "google";
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


