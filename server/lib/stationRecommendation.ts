import type { RouteStop } from "./routePlanner";

export type Point = { lat: number; lng: number };

type PriceReference = { price: string | number } | null | undefined;

export type RecommendationCandidate = RouteStop & { priceReference?: PriceReference };

export type RecommendationOptions = {
  priceWeight?: number;
  realDetoursKm?: Record<string, number | undefined>;
};

export const RECOMMENDATION_CANDIDATE_LIMIT = 3;

function normalizedPriceWeight(value = 70) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function radians(value: number) {
  return value * Math.PI / 180;
}

function project(point: Point, referenceLatitude: number) {
  const radiusKm = 6371;
  return {
    x: radiusKm * radians(point.lng) * Math.cos(radians(referenceLatitude)),
    y: radiusKm * radians(point.lat),
  };
}

export function estimatedDetourKm(point: Point, origin: Point, destination: Point) {
  const referenceLatitude = (origin.lat + destination.lat + point.lat) / 3;
  const p = project(point, referenceLatitude);
  const a = project(origin, referenceLatitude);
  const b = project(destination, referenceLatitude);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  const closestX = a.x + projection * dx;
  const closestY = a.y + projection * dy;
  return Number((Math.hypot(p.x - closestX, p.y - closestY) * 2).toFixed(1));
}

function rankFuelStops(candidates: RecommendationCandidate[], origin: Point, destination: Point, options: RecommendationOptions = {}) {
  const priceWeight = normalizedPriceWeight(options.priceWeight);
  const detourWeight = 100 - priceWeight;
  const priced = candidates.flatMap(candidate => {
    const price = Number(candidate.priceReference?.price);
    const fallbackDetourKm = estimatedDetourKm(candidate, origin, destination);
    const realDetourKm = options.realDetoursKm?.[candidate.placeId];
    const hasRealDetour = Number.isFinite(realDetourKm) && (realDetourKm ?? 0) >= 0;
    return Number.isFinite(price) && price > 0 ? [{ ...candidate, price, estimatedDetourKm: fallbackDetourKm, detourKm: hasRealDetour ? Number(realDetourKm) : fallbackDetourKm, detourSource: hasRealDetour ? "real" as const : "estimated" as const }] : [];
  });
  if (!priced.length) return [];
  const prices = priced.map(candidate => candidate.price);
  const detours = priced.map(candidate => candidate.detourKm);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDetour = Math.min(...detours);
  const maxDetour = Math.max(...detours);
  const priceRange = maxPrice - minPrice || 1;
  const detourRange = maxDetour - minDetour || 1;
  return priced.map(candidate => ({
    ...candidate,
    score: Number((((maxPrice - candidate.price) / priceRange) * priceWeight + ((maxDetour - candidate.detourKm) / detourRange) * detourWeight).toFixed(1)),
  })).sort((left, right) => right.score - left.score || left.price - right.price || left.detourKm - right.detourKm);
}

export function selectFuelRecommendationCandidates(candidates: RecommendationCandidate[], origin: Point, destination: Point, options: RecommendationOptions = {}) {
  return rankFuelStops(candidates, origin, destination, options).slice(0, RECOMMENDATION_CANDIDATE_LIMIT);
}

export function recommendFuelStop(candidates: RecommendationCandidate[], origin: Point, destination: Point, options: RecommendationOptions = {}) {
  const ranked = rankFuelStops(candidates, origin, destination, options);
  if (!ranked.length) return null;
  const best = ranked[0];
  const priceWeight = normalizedPriceWeight(options.priceWeight);
  const detourWeight = 100 - priceWeight;
  const allReal = ranked.every(candidate => candidate.detourSource === "real");
  return {
    ...best,
    comparedStops: ranked.length,
    priceWeight,
    detourWeight,
    rationale: `Melhor pontuação entre ${ranked.length} parada(s) com preço referenciado: ${priceWeight}% preço e ${detourWeight}% desvio da rota.`,
    method: allReal
      ? "O desvio é a distância adicional da rota calculada pelo Google Directions com este posto como parada intermediária."
      : "Parte dos desvios não pôde ser confirmada pela rota e usa uma aproximação geométrica identificada na interface.",
  };
}
