const VEHICLE_KEY = "trajeto-mobile-vehicle";
const VEHICLE_EVENT = "trajeto-mobile-vehicle-change";

export type MobileVehicle = {
  name: string;
  fuel: "gasolina" | "etanol" | "diesel";
  consumption: number;
  tank: number;
};

export function getMobileVehicle(): MobileVehicle | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(VEHICLE_KEY) || "null");
    return value &&
      typeof value.name === "string" &&
      (value.fuel === "gasolina" || value.fuel === "etanol" || value.fuel === "diesel") &&
      Number.isFinite(value.consumption) &&
      value.consumption > 0 &&
      Number.isFinite(value.tank) &&
      value.tank > 0
      ? value
      : null;
  } catch {
    return null;
  }
}

export function saveMobileVehicle(vehicle: MobileVehicle) {
  const normalized: MobileVehicle = {
    name: vehicle.name.trim().slice(0, 40) || "Meu carro",
    fuel: vehicle.fuel,
    consumption: Math.min(50, Math.max(1, Number(vehicle.consumption))),
    tank: Math.min(200, Math.max(10, Number(vehicle.tank))),
  };
  try {
    localStorage.setItem(VEHICLE_KEY, JSON.stringify(normalized));
  } catch {
    return false;
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(VEHICLE_EVENT));
  return true;
}

export function removeMobileVehicle() {
  try {
    localStorage.removeItem(VEHICLE_KEY);
  } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(VEHICLE_EVENT));
}

export const mobileVehicleEvent = VEHICLE_EVENT;
