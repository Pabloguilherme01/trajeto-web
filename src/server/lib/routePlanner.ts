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
  if (!route || !route.legs || route.legs.length === 0) {
    throw new Error("Não foi possível calcular uma rota para os endereços informados.");
  }

  // Somar distância e duração de todas as pernas
  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;
  
  for (const leg of route.legs) {
    totalDistanceMeters += leg.distance.value;
    totalDurationSeconds += leg.duration.value;
  }

  // Origem é a primeira perna, destino é a última perna
  const firstLeg = route.legs[0];
  const lastLeg = route.legs[route.legs.length - 1];

  return {
    distanceMeters: totalDistanceMeters,
    distanceLabel: firstLeg.distance.text, // Usar label da primeira perna como referência
    durationSeconds: totalDurationSeconds,
    durationLabel: firstLeg.duration.text, // Usar label da primeira perna como referência
    summary: route.summary,
    polyline: route.overview_polyline.points,
    origin: firstLeg.start_location,
    destination: lastLeg.end_location,
  };
}
