const DESTINATIONS_KEY = "trajeto-mobile-destinations";
const USAGE_KEY = "trajeto-mobile-destination-usage";
const DESTINATION_EVENT = "trajeto-destination-change";

export type DestinationId = "casa" | "trabalho" | "outro";
export type MobileDestination = {
  id: DestinationId;
  label: string;
  value: string;
};
export type DestinationUsage = Record<DestinationId, { count: number; lastUsed: number }>;

const LABELS: Record<DestinationId, string> = {
  casa: "Casa",
  trabalho: "Trabalho",
  outro: "Destino",
};

function emitChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DESTINATION_EVENT));
}

export function getMobileDestinations(): MobileDestination[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(DESTINATIONS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is MobileDestination => (
      item &&
      (item.id === "casa" || item.id === "trabalho" || item.id === "outro") &&
      typeof item.value === "string" &&
      item.value.trim().length >= 3
    )).map(item => ({
      id: item.id,
      label: LABELS[item.id],
      value: item.value.trim(),
    }));
  } catch {
    return [];
  }
}

export function getDestinationUsage(): Partial<DestinationUsage> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(USAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Partial<DestinationUsage> = {};
    for (const id of ["casa", "trabalho", "outro"] as const) {
      const value = (parsed as Record<string, unknown>)[id];
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const record = value as Record<string, unknown>;
      const count = typeof record.count === "number" && Number.isFinite(record.count) && record.count >= 0 ? Math.floor(record.count) : 0;
      const lastUsed = typeof record.lastUsed === "number" && Number.isFinite(record.lastUsed) && record.lastUsed >= 0 ? record.lastUsed : 0;
      result[id] = { count, lastUsed };
    }
    return result;
  } catch {
    return {};
  }
}

export function getFavoriteDestination(destinations = getMobileDestinations(), usage = getDestinationUsage()) {
  if (!destinations.length) return null;
  return [...destinations].sort((a, b) => (
    (usage[b.id]?.count ?? 0) - (usage[a.id]?.count ?? 0) ||
    (usage[b.id]?.lastUsed ?? 0) - (usage[a.id]?.lastUsed ?? 0)
  ))[0] ?? null;
}

export function rememberDestinationUsage(place: MobileDestination) {
  const current = getDestinationUsage();
  const previous = current[place.id];
  const updated = {
    ...current,
    [place.id]: {
      count: (previous?.count ?? 0) + 1,
      lastUsed: Date.now(),
    },
  };
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(updated));
  } catch {}
  emitChange();
  return updated;
}

export function saveMobileDestination(id: DestinationId, value: string) {
  const normalized = value.trim();
  if (normalized.length < 3) return false;
  const next = [...getMobileDestinations().filter(item => item.id !== id), {
    id,
    label: LABELS[id],
    value: normalized,
  }];
  try {
    localStorage.setItem(DESTINATIONS_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  emitChange();
  return true;
}

export function removeMobileDestination(id: DestinationId) {
  try {
    localStorage.setItem(
      DESTINATIONS_KEY,
      JSON.stringify(getMobileDestinations().filter(item => item.id !== id)),
    );
    const usage = getDestinationUsage();
    delete usage[id];
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {}
  emitChange();
}

export const mobileDestinationEvent = DESTINATION_EVENT;
