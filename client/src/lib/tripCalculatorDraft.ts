export type TripCalculatorDraft = {
  distance: string;
  price: string;
  consumption: string;
  tank: string;
  currentFuel: string;
  roundTrip: boolean;
  tripsPerWeek: number;
  toll: string;
  parking: string;
  other: string;
  alternativePrice: string;
  alternativeConsumption: string;
  monthlyBudget: string;
};

export const tripCalculatorDraftKey = "trajeto-trip-calculator-draft";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function loadTripCalculatorDraft(): Partial<TripCalculatorDraft> | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(tripCalculatorDraftKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Partial<TripCalculatorDraft>;
  } catch {
    return null;
  }
}

export function saveTripCalculatorDraft(draft: TripCalculatorDraft) {
  const storage = getStorage();
  if (!storage) return;
  try { storage.setItem(tripCalculatorDraftKey, JSON.stringify(draft)); } catch {}
}

export function clearTripCalculatorDraft() {
  const storage = getStorage();
  if (!storage) return;
  try { storage.removeItem(tripCalculatorDraftKey); } catch {}
}
