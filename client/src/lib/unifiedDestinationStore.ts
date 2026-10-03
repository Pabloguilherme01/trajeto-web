import { getMobileDestinations } from "@/lib/mobileDestinations";
import { listMobileStationFavorites } from "@/lib/mobileStationStore";
import {
  mobileStationDestination,
  personalDestination,
  type UnifiedDestination,
} from "@/lib/unifiedDestination";

const FAVORITES_KEY = "trajeto-unified-destination-favorites";
const EVENT = "trajeto-unified-destination-change";
const MAX_GENERIC_FAVORITES = 40;

function emitChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

function isUnifiedDestination(value: unknown): value is UnifiedDestination {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.address === "string" &&
    (item.kind === "place" || item.kind === "station" || item.kind === "personal" || item.kind === "route");
}

export function listGenericDestinationFavorites(): UnifiedDestination[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter(isUnifiedDestination).slice(0, MAX_GENERIC_FAVORITES)
      : [];
  } catch {
    return [];
  }
}

export function listUnifiedDestinationFavorites(): UnifiedDestination[] {
  const merged = [
    ...getMobileDestinations().map(personalDestination),
    ...listMobileStationFavorites().map(mobileStationDestination),
    ...listGenericDestinationFavorites(),
  ];
  const unique = new Map<string, UnifiedDestination>();
  for (const item of merged) {
    const key = /^business-\d{14}$/.test(item.id) ? item.id : item.address
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

export function isGenericDestinationFavorite(id: string) {
  return listGenericDestinationFavorites().some(item => item.id === id);
}

export function toggleGenericDestinationFavorite(destination: UnifiedDestination) {
  const current = listGenericDestinationFavorites();
  const exists = current.some(item => item.id === destination.id);
  const next = exists
    ? current.filter(item => item.id !== destination.id)
    : [destination, ...current].slice(0, MAX_GENERIC_FAVORITES);
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    emitChange();
    return { saved: !exists, destinations: next, error: false };
  } catch {
    return { saved: exists, destinations: current, error: true };
  }
}

export const unifiedDestinationEvent = EVENT;
