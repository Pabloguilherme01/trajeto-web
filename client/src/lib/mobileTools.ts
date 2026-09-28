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
    ? ` · referência de ${priceValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/L`
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

export function openNavigation(lat: number, lng: number, label?: string) {
  const encoded = encodeURIComponent(label ?? (lat + "," + lng));
  const google = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng + "&travelmode=driving";
  const waze = "https://www.waze.com/ul?ll=" + lat + "%2C" + lng + "&navigate=yes&zoom=17&q=" + encoded;
  return { google, waze };
}

export function vibration(pattern: number | number[] = 12) {
  try { navigator.vibrate?.(pattern); } catch {}
}
