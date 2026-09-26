import type { AlertTimeSlot } from "./routeAlerts";

export type AlertCorridor = { id: string; label: string; point: { lat: number; lng: number } };

export const ALERT_CORRIDOR_IDS = ["aguas-lindas", "ceilandia", "taguatinga", "brasilia", "valparaiso", "cidade-ocidental", "luziania", "formosa", "planaltina-go", "santo-antonio"] as const;

const corridors: AlertCorridor[] = [
  { id: "aguas-lindas", label: "Águas Lindas", point: { lat: -15.761, lng: -48.281 } },
  { id: "ceilandia", label: "Ceilândia", point: { lat: -15.819, lng: -48.104 } },
  { id: "taguatinga", label: "Taguatinga", point: { lat: -15.833, lng: -48.055 } },
  { id: "brasilia", label: "Brasília", point: { lat: -15.794, lng: -47.883 } },
  { id: "valparaiso", label: "Valparaíso", point: { lat: -16.066, lng: -47.98 } },
  { id: "cidade-ocidental", label: "Cidade Ocidental", point: { lat: -16.076, lng: -47.925 } },
  { id: "luziania", label: "Luziânia", point: { lat: -16.253, lng: -47.95 } },
  { id: "formosa", label: "Formosa", point: { lat: -15.538, lng: -47.337 } },
  { id: "planaltina-go", label: "Planaltina de Goiás", point: { lat: -15.617, lng: -47.65 } },
  { id: "santo-antonio", label: "Santo Antônio do Descoberto", point: { lat: -15.944, lng: -48.257 } },
];

export function getAlertCorridor(id: string) {
  return corridors.find(corridor => corridor.id === id) ?? null;
}

export function isSlotActiveNow(timeSlot: AlertTimeSlot, date = new Date()) {
  if (timeSlot === "anytime") return true;
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(date));
  if (timeSlot === "morning") return hour >= 6 && hour < 10;
  if (timeSlot === "afternoon") return hour >= 11 && hour < 17;
  return hour >= 17 && hour < 21;
}
