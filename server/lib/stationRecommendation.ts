import type { RouteStop } from "./routePlanner";

export type Point = { lat: number; lng: number };

type PriceReference = { price: string | number } | null | undefined;

export type RecommendationCandidate = RouteStop & { priceReference?: PriceReference };

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

export function recommendFuelStop(candidates: RecommendationCandidate[], origin: Point, destination: Point) {
  const priced = candidates.flatMap(candidate => {
    const price = Number(candidate.priceReference?.price);
    return Number.isFinite(price) && price > 0 ? [{ ...candidate, price, estimatedDetourKm: estimatedDetourKm(candidate, origin, destination) }] : [];
  });
  if (!priced.length) return null;
  const prices = priced.map(candidate => candidate.price);
  const detours = priced.map(candidate => candidate.estimatedDetourKm);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDetour = Math.min(...detours);
  const maxDetour = Math.max(...detours);
  const priceRange = maxPrice - minPrice || 1;
  const detourRange = maxDetour - minDetour || 1;
  const ranked = priced.map(candidate => ({
    ...candidate,
    score: Number((((maxPrice - candidate.price) / priceRange) * 70 + ((maxDetour - candidate.estimatedDetourKm) / detourRange) * 30).toFixed(1)),
  })).sort((left, right) => right.score - left.score || left.price - right.price || left.estimatedDetourKm - right.estimatedDetourKm);
  const best = ranked[0];
  return {
    ...best,
    comparedStops: ranked.length,
    rationale: `Melhor pontuação entre ${ranked.length} parada(s) com preço referenciado: 70% preço e 30% desvio geométrico estimado de ida e volta à linha da rota.`,
    method: "O desvio é uma aproximação geométrica para triagem; confirme a navegação no mapa antes de seguir.",
  };
}
