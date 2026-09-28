import { isOfflineRouteStale, type OfflineRoute } from "@/lib/offlineStore";
import type { MobileVehicle } from "@/lib/mobileVehicle";

export type SavedRouteContext = {
  distanceKm: number;
  durationMinutes: number | null;
  estimatedFuelCost: number | null;
  stale: boolean;
};

export function summarizeSavedRoute(
  route: Pick<OfflineRoute, "payload" | "savedAt"> | null,
  vehicle: Pick<MobileVehicle, "consumption"> | null,
  fuelPricePerLiter: number | null,
  now = Date.now(),
): SavedRouteContext | null {
  if (!route || typeof route.payload !== "object" || route.payload === null) return null;
  const payload = route.payload as { route?: { distanceMeters?: unknown; durationSeconds?: unknown } };
  const distanceMeters = Number(payload.route?.distanceMeters);
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return null;

  const distanceKm = distanceMeters / 1000;
  const durationSeconds = Number(payload.route?.durationSeconds);
  const durationMinutes = Number.isFinite(durationSeconds) && durationSeconds >= 0
    ? Math.round(durationSeconds / 60)
    : null;

  const price = Number(fuelPricePerLiter);
  const consumption = Number(vehicle?.consumption);
  const estimatedFuelCost =
    Number.isFinite(price) && price > 0 && Number.isFinite(consumption) && consumption > 0
      ? (distanceKm / consumption) * price
      : null;

  return {
    distanceKm,
    durationMinutes,
    estimatedFuelCost,
    stale: isOfflineRouteStale(route.savedAt, now),
  };
}
