export type ArrivalDay = "today" | "tomorrow";

export function parseLocalTime(value: string, day: ArrivalDay, now = new Date()): Date | null {
  const match = /^(\\d{2}):(\\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  const target = new Date(now);
  target.setSeconds(0, 0);
  target.setHours(hour, minute, 0, 0);
  if (day === "tomorrow") target.setDate(target.getDate() + 1);
  return target;
}

export function calculateDepartureTime(
  arrivalTime: string,
  day: ArrivalDay,
  durationSeconds: number,
  bufferMinutes: number,
  now = new Date(),
) {
  const arrival = parseLocalTime(arrivalTime, day, now);
  if (!arrival || !Number.isFinite(durationSeconds) || durationSeconds < 0) return null;

  const buffer = Number.isFinite(bufferMinutes) ? Math.max(0, Math.min(180, bufferMinutes)) : 0;
  const departure = new Date(arrival.getTime() - durationSeconds * 1000 - buffer * 60000);
  return {
    arrival,
    departure,
    totalPlanningMinutes: Math.ceil(durationSeconds / 60000) + buffer,
  };
}


export function describeDepartureStatus(
  departure: Date,
  now = new Date(),
): "upcoming" | "due" | "late" {
  const deltaMs = departure.getTime() - now.getTime();
  if (deltaMs > 60_000) return "upcoming";
  if (deltaMs >= -60_000) return "due";
  return "late";
}

export function departureMinutesDelta(
  departure: Date,
  now = new Date(),
): number {
  return Math.round((departure.getTime() - now.getTime()) / 60000);
}
