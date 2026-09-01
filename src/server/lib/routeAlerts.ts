export const alertTimeSlots = [
  { value: "morning", label: "Manhã · 6h–10h" },
  { value: "afternoon", label: "Tarde · 11h–16h" },
  { value: "evening", label: "Fim do dia · 17h–21h" },
  { value: "anytime", label: "Qualquer horário" },
] as const;

export type AlertTimeSlot = (typeof alertTimeSlots)[number]["value"];

export function isAlertTimeSlot(value: string): value is AlertTimeSlot {
  return alertTimeSlots.some(slot => slot.value === value);
}
