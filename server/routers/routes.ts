import { z } from "zod";
import { createRouteSearch, getAuthorizedStationsForQuery, getLatestPriceSnapshots, getPriceReferencesByAreas, getRouteSearchById, getUserVehicleById, rememberGooglePlaceIds } from "../db";
import { makeRequest, type DirectionsResult, type GeocodingResult, type PlacesSearchResult } from "../_core/map";
import { publicProcedure, router } from "../_core/trpc";
import { normalizeStops, routeSummary } from "../lib/routePlanner";
import { routeTrafficStatus } from "../lib/routeTraffic";
import { compareFuelPrices } from "../lib/fuelEconomy";
import { recommendFuelStop, selectFuelRecommendationCandidates } from "../lib/stationRecommendation";
import { directionsWaypoint, realDetourKm } from "../lib/routeDetour";
import { anpPricePlaceId, verifiedPlannerPriceReferences } from "../lib/plannerPriceReference";

const plannerInput = z.object({
  origin: z.string().trim().min(3).max(240),
  destination: z.string().trim().min(3).max(240),
  locationConsent: z.boolean().default(false),
  economy: z.object({
    vehicleId: z.number().int().positive(),
    gasolinePrice: z.number().finite().positive().lte(100),
    ethanolPrice: z.number().finite().positive().lte(100),
    gasolineKmPerLiter: z.number().finite().positive().lte(100),
    ethanolKmPerLiter: z.number().finite().positive().lte(100),
  }).optional(),
  recommendation: z.object({
    priceWeight: z.number().int().min(0).max(100).default(70),
  }).default({ priceWeight: 70 }),
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
    void rememberGooglePlaceIds(stops.map(stop => stop.placeId));
    const [anpReferences, authorizedByArea] = await Promise.all([
      getPriceReferencesByAreas([locality(originGeo), locality(destinationGeo)].filter((area): area is { municipality: string; state: string } => Boolean(area))),
      Promise.all([input.origin, input.destination].map(query => getAuthorizedStationsForQuery(query))),
    ]);
    const authorizedStations = Array.from(new Map(authorizedByArea.flat().map(station => [station.authorization, station])).values());
    const snapshotIds = Array.from(new Set([
      ...stops.map(stop => stop.placeId),
      ...authorizedStations.map(station => anpPricePlaceId(station.authorization)),
    ]));
    const snapshots = await getLatestPriceSnapshots(snapshotIds);
    const vehicle = input.economy && ctx.user ? await getUserVehicleById(ctx.user.id, input.economy.vehicleId) : null;
    const economy = input.economy && vehicle ? compareFuelPrices({
      distanceKm: route.distanceMeters / 1000,
      gasolinePrice: input.economy.gasolinePrice,
      ethanolPrice: input.economy.ethanolPrice,
      gasolineKmPerLiter: input.economy.gasolineKmPerLiter,
      ethanolKmPerLiter: input.economy.ethanolKmPerLiter,
      tankLiters: vehicle.tankLiters ? Number(vehicle.tankLiters) : null,
    }) : null;
    const selectedEconomy = economy ? economy[economy.recommendedFuel] : null;
    const routeSearchPersistence = createRouteSearch({
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
      vehicleId: vehicle?.id ?? null,
      vehicleNickname: vehicle?.nickname ?? null,
      selectedFuel: economy?.recommendedFuel ?? null,
      gasolinePrice: input.economy?.gasolinePrice ?? null,
      ethanolPrice: input.economy?.ethanolPrice ?? null,
      gasolineKmPerLiter: input.economy?.gasolineKmPerLiter ?? null,
      ethanolKmPerLiter: input.economy?.ethanolKmPerLiter ?? null,
      estimatedTripCost: selectedEconomy?.tripCost ?? null,
      estimatedLiters: selectedEconomy?.litersNeeded ?? null,
    });

    const trafficPromise = routeTrafficStatus(originPoint, destinationPoint);

    const stopsWithPrice = verifiedPlannerPriceReferences(stops, authorizedStations, snapshots);
    const candidateStops = selectFuelRecommendationCandidates(stopsWithPrice, route.origin, route.destination, { priceWeight: input.recommendation.priceWeight });
    const detourResults = await Promise.allSettled(candidateStops.map(candidate => makeRequest<DirectionsResult>(
      "/maps/api/directions/json",
      { origin: input.origin, destination: input.destination, mode: "driving", departure_time: "now", waypoints: directionsWaypoint(candidate) },
    )));
    const realDetoursKm = Object.fromEntries(detourResults.flatMap((result, index) => {
      if (result.status !== "fulfilled") return [];
      const routeWithStop = routeSummary(result.value);
      const detourKm = realDetourKm(route.distanceMeters, routeWithStop.distanceMeters);
      return detourKm == null ? [] : [[candidateStops[index].placeId, detourKm]];
    }));
    const recommendation = recommendFuelStop(candidateStops, route.origin, route.destination, {
      priceWeight: input.recommendation.priceWeight,
      realDetoursKm,
      netSavings: input.economy ? { routeDistanceKm: route.distanceMeters / 1000, gasolineKmPerLiter: input.economy.gasolineKmPerLiter } : undefined,
    });
    const [traffic, saved] = await Promise.all([
      trafficPromise,
      ctx.user ? routeSearchPersistence : Promise.resolve(null),
    ]);
    if (!ctx.user) void routeSearchPersistence.catch(error => console.warn("[Routes] Não foi possível registrar o histórico da rota:", error));
    return {
      searchId: saved?.id ?? null,
      route,
      stops: stopsWithPrice,
      priceCoverage: snapshots.length,
      anpReferences,
      traffic,
      economy,
      recommendation,
      recommendationDiagnostics: {
        requestedCandidates: candidateStops.length,
        realDetoursCalculated: Object.keys(realDetoursKm).length,
      },
    };
  }),
  byId: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => getRouteSearchById(input.id)),
});
