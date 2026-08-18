import { z } from "zod";
import { createRouteSearch, getLatestPriceSnapshots, getPriceReferencesByAreas, getRouteSearchById } from "../db";
import { makeRequest, type DirectionsResult, type GeocodingResult, type PlacesSearchResult } from "../_core/map";
import { publicProcedure, router } from "../_core/trpc";
import { normalizeStops, routeSummary } from "../lib/routePlanner";
import { routeTrafficStatus } from "../lib/routeTraffic";

const plannerInput = z.object({
  origin: z.string().trim().min(3).max(240),
  destination: z.string().trim().min(3).max(240),
  locationConsent: z.boolean().default(false),
});

function locality(result: GeocodingResult) {
  const components = result.results[0]?.address_components ?? [];
  const city = components.find(component => component.types.includes("administrative_area_level_2"))?.long_name ?? components.find(component => component.types.includes("locality"))?.long_name ?? null;
  const state = components.find(component => component.types.includes("administrative_area_level_1"))?.short_name ?? null;
  return city && state ? { municipality: city, state } : null;
}

export const routesRouter = router({
  plan: publicProcedure.input(plannerInput).mutation(async ({ ctx, input }) => {
    const [directions, originGeo, destinationGeo] = await Promise.all([
      makeRequest<DirectionsResult>("/maps/api/directions/json", { origin: input.origin, destination: input.destination, mode: "driving", alternatives: "true", departure_time: "now" }),
      makeRequest<GeocodingResult>("/maps/api/geocode/json", { address: input.origin }),
      makeRequest<GeocodingResult>("/maps/api/geocode/json", { address: input.destination }),
    ]);

    const route = routeSummary(directions);
    const originPoint = originGeo.results[0]?.geometry.location ?? route.origin;
    const destinationPoint = destinationGeo.results[0]?.geometry.location ?? route.destination;

    const nearby = await Promise.all([
      makeRequest<PlacesSearchResult>("/maps/api/place/nearbysearch/json", { location: `${originPoint.lat},${originPoint.lng}`, radius: 10000, type: "gas_station" }),
      makeRequest<PlacesSearchResult>("/maps/api/place/nearbysearch/json", { location: `${destinationPoint.lat},${destinationPoint.lng}`, radius: 10000, type: "gas_station" }),
    ]);

    const stops = normalizeStops(nearby);
    const [snapshots, anpReferences] = await Promise.all([
      getLatestPriceSnapshots(stops.map(stop => stop.placeId)),
      getPriceReferencesByAreas([locality(originGeo), locality(destinationGeo)].filter((area): area is { municipality: string; state: string } => Boolean(area))),
    ]);
    const snapshotByPlace = new Map(snapshots.map(snapshot => [snapshot.placeId, snapshot]));
    const saved = await createRouteSearch({
      userId: ctx.user?.id ?? null,
      origin: input.origin,
      destination: input.destination,
      originLat: originPoint.lat,
      originLng: originPoint.lng,
      destinationLat: destinationPoint.lat,
      destinationLng: destinationPoint.lng,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      routeSummary: route.summary,
      overviewPolyline: route.polyline,
      locationConsent: input.locationConsent,
    });

    const traffic = await routeTrafficStatus(originPoint, destinationPoint);

    return {
      searchId: saved?.id ?? null,
      route,
      stops: stops.map(stop => ({ ...stop, priceReference: snapshotByPlace.get(stop.placeId) ?? null })),
      priceCoverage: snapshots.length,
      anpReferences,
      traffic,
    };
  }),
  byId: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => getRouteSearchById(input.id)),
});
