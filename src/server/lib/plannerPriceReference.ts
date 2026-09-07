import type { RouteStop } from "./routePlanner";
import { resolveStationIdentity } from "./stationIdentityResolver";

type AuthorizedStation = { authorization: string; legalName: string; address: string; brand: string };
type PriceSnapshot = { placeId: string; product: string; price: string | number; collectedAt: Date };

export function anpPricePlaceId(authorization: string) {
  return `anp-cnpj-${authorization.replace(/\D/g, "")}`;
}

export function verifiedPlannerPriceReferences(stops: RouteStop[], authorizedStations: AuthorizedStation[], snapshots: PriceSnapshot[]) {
  const gasolineByPlaceId = new Map<string, PriceSnapshot>();
  for (const snapshot of snapshots) {
    if (snapshot.product === "gasoline" && !gasolineByPlaceId.has(snapshot.placeId)) gasolineByPlaceId.set(snapshot.placeId, snapshot);
  }
  return stops.map(stop => {
    const match = resolveStationIdentity(stop, authorizedStations);
    const directPrice = gasolineByPlaceId.get(stop.placeId);
    const verifiedPrice = match.status === "probable" && match.authorization ? gasolineByPlaceId.get(anpPricePlaceId(match.authorization)) : null;
    return { ...stop, anpMatch: match, priceReference: directPrice ?? verifiedPrice ?? null };
  });
}
