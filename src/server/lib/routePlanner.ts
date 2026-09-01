import type { DirectionsResult, PlacesSearchResult } from "../_core/map";

export type RouteStop = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  isOpen?: boolean;
};

export function normalizeStops(searches: PlacesSearchResult[]): RouteStop[] {
  const unique = new Map<string, RouteStop>();

  for (const search of searches) {
    for (const place of search.results) {
      if (!place.place_id || unique.has(place.place_id)) continue;
      unique.set(place.place_id, {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        isOpen: place.opening_hours?.open_now,
      });
    }
  }

  return Array.from(unique.values()).slice(0, 8);
}

export function routeSummary(result: DirectionsResult) {
  const route = result.routes[0];
  const leg = route?.legs[0];
  if (!route || !leg) {
    throw new Error("Não foi possível calcular uma rota para os endereços informados.");
  }

  return {
    distanceMeters: leg.distance.value,
    distanceLabel: leg.distance.text,
    durationSeconds: leg.duration.value,
    durationLabel: leg.duration.text,
    summary: route.summary,
    polyline: route.overview_polyline.points,
    origin: leg.start_location,
    destination: leg.end_location,
  };
}
