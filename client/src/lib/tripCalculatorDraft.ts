import type { TripCalculatorModeSelection } from "@/lib/tripCalculatorModes";
import { isTripCalculatorModeSelection } from "@/lib/tripCalculatorModes";

export type TripCalculatorDraft = {
  mode?: TripCalculatorModeSelection;
  recurring?: boolean;
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
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadTripCalculatorDraft(): Partial<TripCalculatorDraft> | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(tripCalculatorDraftKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const draft: Partial<TripCalculatorDraft> = {};
    const textFields = ["distance", "price", "consumption", "tank", "currentFuel", "toll", "parking", "other", "alternativePrice", "alternativeConsumption", "monthlyBudget"] as const;
    for (const key of textFields) {
      if (typeof parsed[key] === "string" && parsed[key].length <= 100) draft[key] = parsed[key];
    }
    for (const key of ["roundTrip", "recurring"] as const) {
      if (typeof parsed[key] === "boolean") draft[key] = parsed[key];
    }
    if (isTripCalculatorModeSelection(parsed.mode)) draft.mode = parsed.mode;
    if (Number.isInteger(parsed.tripsPerWeek) && parsed.tripsPerWeek >= 1 && parsed.tripsPerWeek <= 21) {
      draft.tripsPerWeek = parsed.tripsPerWeek;
    }
    return Object.keys(draft).length ? draft : null;
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
