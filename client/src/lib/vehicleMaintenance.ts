const KEY = "trajeto-vehicle-maintenance-v1";
const EVENT = "trajeto-vehicle-maintenance-change";

export type MaintenanceItem = {
  id: "oleo" | "pneus" | "seguro" | "licenciamento";
  label: string;
  dueDate: string;
};

const IDS = new Set<MaintenanceItem["id"]>(["oleo","pneus","seguro","licenciamento"]);

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T12:00:00"));
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

export function getMaintenanceItems(): MaintenanceItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is MaintenanceItem =>
      item && typeof item === "object" &&
      IDS.has((item as MaintenanceItem).id) &&
      typeof (item as MaintenanceItem).label === "string" &&
      validDate((item as MaintenanceItem).dueDate),
    );
  } catch { return []; }
}

export function saveMaintenanceItem(item: MaintenanceItem): boolean {
  if (!IDS.has(item.id) || !validDate(item.dueDate)) return false;
  try {
    const next = [...getMaintenanceItems().filter(current => current.id !== item.id), {
      id: item.id,
      label: item.label.trim().slice(0, 50),
      dueDate: item.dueDate,
    }].sort((a,b) => a.dueDate.localeCompare(b.dueDate));
    localStorage.setItem(KEY, JSON.stringify(next));
    notify();
    return true;
  } catch { return false; }
}

export function removeMaintenanceItem(id: MaintenanceItem["id"]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(getMaintenanceItems().filter(item => item.id !== id)));
  } catch {}
  notify();
}

export function getMaintenanceStatus(dueDate: string, today = new Date()): "vencido" | "proximo" | "ok" {
  const due = new Date(dueDate + "T12:00:00");
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const days = Math.ceil((due.getTime() - start.getTime()) / 86400000);
  if (days < 0) return "vencido";
  if (days <= 30) return "proximo";
  return "ok";
}

export const vehicleMaintenanceEvent = EVENT;
