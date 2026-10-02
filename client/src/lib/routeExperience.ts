import type { PlannerExperienceMode } from "./plannerModes";
import type { PublicTravelMode } from "./publicRouting";

export type RouteFreshness = "fresh" | "aging" | "stale";

export function routeFreshness(
  savedAt: string,
  now = Date.now()
): RouteFreshness {
  const age = Math.max(0, now - Date.parse(savedAt));
  const hour = 60 * 60 * 1000;
  if (age <= 6 * hour) return "fresh";
  if (age <= 24 * hour) return "aging";
  return "stale";
}

export function effectivePlannerMode(
  requested: PlannerExperienceMode,
  online: boolean,
  hasExactSavedRoute: boolean
): PlannerExperienceMode {
  if (requested === "offline") return "offline";
  // Connectivity is a runtime constraint, not a separate user preference.
  // When the device is offline, every network-dependent experience behaves
  // as Offline. Privacy remains explicit because it carries stricter rules
  // even when no network is available.
  if (!online && requested !== "private") return "offline";
  return requested;
}

export function shouldAutoRefreshSavedRoute(
  experience: PlannerExperienceMode,
  online: boolean,
  freshness: RouteFreshness
) {
  return experience === "smart" && online && freshness === "stale";
}

export function plannerActionLabel(
  experience: PlannerExperienceMode,
  travelMode: PublicTravelMode,
  online: boolean
) {
  if (experience === "offline" || !online) return "Usar rota offline";
  if (experience === "economy") return "Calcular rota e custo";
  if (experience === "driving") return "Preparar condução";
  if (travelMode === "transit") return "Planejar transporte";
  if (travelMode === "walking") return "Planejar caminhada";
  if (travelMode === "cycling") return "Planejar bicicleta";
  return "Encontrar melhor rota";
}
