const KEY = "trajeto-departure-checklist-v1";

export type DepartureChecklistId = "route" | "destination" | "vehicle" | "documents" | "fuel";

export type DepartureChecklistState = {
  date: string;
  completed: DepartureChecklistId[];
};

function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function getDepartureChecklistDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDepartureChecklist(): DepartureChecklistState {
  const today = getDepartureChecklistDate();
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return { date: today, completed: [] };
    const parsed = JSON.parse(raw) as Partial<DepartureChecklistState>;
    if (parsed.date !== today || !Array.isArray(parsed.completed)) return { date: today, completed: [] };
    const allowed: DepartureChecklistId[] = ["route", "destination", "vehicle", "documents", "fuel"];
    return { date: today, completed: parsed.completed.filter((id): id is DepartureChecklistId => allowed.includes(id as DepartureChecklistId)) };
  } catch {
    return { date: today, completed: [] };
  }
}

export function setDepartureChecklistCompleted(id: DepartureChecklistId, completed: boolean): DepartureChecklistState {
  const current = getDepartureChecklist();
  const next = completed
    ? Array.from(new Set([...current.completed, id]))
    : current.completed.filter(item => item !== id);
  const state = { date: current.date, completed: next };
  try { storage()?.setItem(KEY, JSON.stringify(state)); } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("trajeto-departure-checklist"));
  return state;
}

export function resetDepartureChecklist(): DepartureChecklistState {
  const state = { date: getDepartureChecklistDate(), completed: [] as DepartureChecklistId[] };
  try { storage()?.setItem(KEY, JSON.stringify(state)); } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("trajeto-departure-checklist"));
  return state;
}
