import { inferPlaceCategory, normalizePlaceSearchText } from "@/lib/placeSearch";

export type ResolvedIntent =
  | { kind: "map"; query: string }
  | { kind: "route"; query: string }
  | { kind: "offline"; query: string };

const ROUTE_PATTERNS = [
  /\bcomo (ir|chegar)\b/,
  /\bme leve\b/,
  /\bnavegar\b/,
  /\bno caminho\b/,
];

const OFFLINE_PATTERNS = [
  /\bvapt\b/,
  /\bupa\b/,
  /\bsamu\b/,
  /\bhospital bom jesus\b/,
  /\brodoviaria\b/,
  /\bprefeitura\b/,
  /\bcras\b/,
  /\bassistencia social\b/,
];

export function resolveIntentQuery(query: string): ResolvedIntent {
  const normalized = normalizePlaceSearchText(query);
  if (!normalized) return { kind: "map", query: "" };

  if (ROUTE_PATTERNS.some(pattern => pattern.test(normalized))) {
    return { kind: "route", query: query.trim() };
  }

  if (OFFLINE_PATTERNS.some(pattern => pattern.test(normalized))) {
    return { kind: "offline", query: query.trim() };
  }

  const category = inferPlaceCategory(query);
  if (category === "fuel") return { kind: "map", query: query.trim() };
  return { kind: "map", query: query.trim() };
}
