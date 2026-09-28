const FUEL_LOG_KEY = "trajeto-fuel-log";
const FUEL_LOG_EVENT = "trajeto-fuel-log-change";
const MAX_ENTRIES = 100;
const LAST_FUEL_PRICE_KEY = "trajeto-last-fuel-price";

export type FuelLogEntry = {
  id: string;
  date: string;
  liters: number;
  totalCost: number;
  odometerKm?: number;
  note?: string;
};

export type FuelLogSummary = {
  entries: number;
  totalLiters: number;
  totalCost: number;
  averagePricePerLiter: number;
  latestPricePerLiter: number;
  odometerDistanceKm: number;
  estimatedCostPerKm: number;
};

function getStorage(): Storage | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function emitChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(FUEL_LOG_EVENT));
}

function normalizeEntry(value: unknown): FuelLogEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    typeof item.date !== "string" ||
    !Number.isFinite(item.liters) ||
    !Number.isFinite(item.totalCost) ||
    Number(item.liters) <= 0 ||
    Number(item.totalCost) < 0
  ) return null;

  const odometer = Number(item.odometerKm);
  const note = typeof item.note === "string" ? item.note.trim().slice(0, 120) : undefined;
  return {
    id: item.id,
    date: item.date,
    liters: Math.min(200, Number(item.liters)),
    totalCost: Math.min(100000, Number(item.totalCost)),
    ...(Number.isFinite(odometer) && odometer >= 0 ? { odometerKm: odometer } : {}),
    ...(note ? { note } : {}),
  };
}

export function listFuelLog(): FuelLogEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(FUEL_LOG_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeEntry)
      .filter((item): item is FuelLogEntry => item !== null)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  } catch {
    return [];
  }
}

export function addFuelLogEntry(input: {
  date?: string;
  liters: number;
  totalCost: number;
  odometerKm?: number;
  note?: string;
}): FuelLogEntry | null {
  const storage = getStorage();
  if (!storage) return null;

  const liters = Number(input.liters);
  const totalCost = Number(input.totalCost);
  const odometer = input.odometerKm === undefined || input.odometerKm === null ? undefined : Number(input.odometerKm);

  if (!Number.isFinite(liters) || liters <= 0 || liters > 200) return null;
  if (!Number.isFinite(totalCost) || totalCost < 0 || totalCost > 100000) return null;
  if (odometer !== undefined && (!Number.isFinite(odometer) || odometer < 0)) return null;

  const date = input.date && Number.isFinite(Date.parse(input.date)) ? new Date(input.date).toISOString() : new Date().toISOString();
  const entry: FuelLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    liters,
    totalCost,
    ...(odometer !== undefined ? { odometerKm: odometer } : {}),
    ...(input.note?.trim() ? { note: input.note.trim().slice(0, 120) } : {}),
  };

  try {
    const next = [entry, ...listFuelLog()].slice(0, MAX_ENTRIES);
    storage.setItem(FUEL_LOG_KEY, JSON.stringify(next));
    storage.setItem(LAST_FUEL_PRICE_KEY, String(totalCost / liters));
    emitChange();
    return entry;
  } catch {
    return null;
  }
}

export function removeFuelLogEntry(id: string): boolean {
  if (!id) return false;
  const storage = getStorage();
  if (!storage) return false;
  try {
    const current = listFuelLog();
    const next = current.filter(item => item.id !== id);
    if (next.length === current.length) return false;
    storage.setItem(FUEL_LOG_KEY, JSON.stringify(next));
    emitChange();
    return true;
  } catch {
    return false;
  }
}

export function summarizeFuelLog(entries = listFuelLog()): FuelLogSummary {
  const valid = entries.filter(item => item.liters > 0 && item.totalCost >= 0);
  const totalLiters = valid.reduce((sum, item) => sum + item.liters, 0);
  const totalCost = valid.reduce((sum, item) => sum + item.totalCost, 0);
  const chronological = [...valid]
    .filter(item => Number.isFinite(item.odometerKm))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  const firstOdometer = chronological[0]?.odometerKm;
  const lastOdometer = chronological.at(-1)?.odometerKm;
  const odometerDistanceKm =
    firstOdometer !== undefined && lastOdometer !== undefined && lastOdometer >= firstOdometer
      ? lastOdometer - firstOdometer
      : 0;

  const latest = valid[0];
  return {
    entries: valid.length,
    totalLiters,
    totalCost,
    averagePricePerLiter: totalLiters > 0 ? totalCost / totalLiters : 0,
    latestPricePerLiter: latest && latest.liters > 0 ? latest.totalCost / latest.liters : 0,
    odometerDistanceKm,
    estimatedCostPerKm: odometerDistanceKm > 0 ? totalCost / odometerDistanceKm : 0,
  };
}

export const fuelLogEvent = FUEL_LOG_EVENT;


export function buildFuelLogCsv(entries = listFuelLog()): string {
  const escape = (value: string | number) => '"' + String(value).replace(/"/g, '""') + '"';
  const rows = entries.map(entry => [
    new Date(entry.date).toLocaleDateString("pt-BR"),
    entry.liters.toFixed(2),
    entry.totalCost.toFixed(2),
    (entry.totalCost / entry.liters).toFixed(2),
    entry.odometerKm ?? "",
    entry.note ?? "",
  ].map(escape).join(";"));
  return [
    ["Data", "Litros", "Valor total (R$)", "Preço/L (R$)", "Hodômetro (km)", "Observação"].map(escape).join(";"),
    ...rows,
  ].join("\\n");
}
