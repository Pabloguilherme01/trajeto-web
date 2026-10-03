import { appUrl } from "@/lib/appUrl";
import { privateOriginForUrl } from "@/lib/locationPrivacy";

export type ReusableTrip = { origin: string; destination: string };

export type PlannerMapDestination = {
  name?: string | null;
  address: string;
  source?: string | null;
};

export function plannerDestinationFromMapItem(item: PlannerMapDestination) {
  const address = item.address.trim();
  const name = item.name?.trim() ?? "";
  return item.source === "ANP" && name
    ? [name, address].filter(Boolean).join(", ")
    : address || name;
}

export function buildDestinationPlannerUrl(destination: string) {
  const params = new URLSearchParams({ destino: destination.trim() });
  return appUrl("/planejar") + "?" + params.toString();
}

export function buildReusableTripPlannerUrl(
  trip: ReusableTrip,
  options: { auto?: boolean; drivingMode?: boolean } = {},
) {
  const params = new URLSearchParams({ destino: trip.destination.trim() });
  const origin = privateOriginForUrl(trip.origin);
  const privateOrigin = !origin && Boolean(trip.origin.trim());

  if (origin) params.set("origem", origin);
  if (options.auto && !privateOrigin) params.set("auto", "1");
  if (options.drivingMode) params.set("conducao", "1");

  return appUrl("/planejar") + "?" + params.toString();
}

export function buildSavedRoutePlannerUrl(routeId: string) {
  const params = new URLSearchParams({ rota: routeId.trim() });
  return appUrl("/planejar") + "?" + params.toString();
}
