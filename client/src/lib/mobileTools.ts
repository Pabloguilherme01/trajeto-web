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
  const params = new URLSearchParams({
    api: "1",
    origin: normalizedOrigin,
    destination: normalizedDestination,
    travelmode: travelMode,
  });
  if (navigate) params.set("dir_action", "navigate");
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

export function buildAppleMapsDirectionsUrl(destination: string, origin?: string) {
  const params = new URLSearchParams({ daddr: destination.trim(), dirflg: "d" });
  if (origin?.trim()) params.set("saddr", origin.trim());
  return "https://maps.apple.com/?" + params.toString();
}

export function openNavigation(lat: number, lng: number, label?: string) {
  const encoded = encodeURIComponent(label ?? (lat + "," + lng));
  const google = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng + "&travelmode=driving";
  const waze = "https://www.waze.com/ul?ll=" + lat + "%2C" + lng + "&navigate=yes&zoom=17&q=" + encoded;
  return { google, waze };
}

export function vibration(pattern: number | number[] = 12) {
  try { navigator.vibrate?.(pattern); } catch {}
}
