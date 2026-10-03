export type ArrivalDay = "today" | "tomorrow";

function localDateKey(date: Date) {
  return [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
}

export function defaultArrivalTarget(now = new Date()): { time: string; day: ArrivalDay } {
  const target = new Date(now.getTime() + 60 * 60 * 1000);
  target.setMinutes(Math.ceil(target.getMinutes() / 5) * 5, 0, 0);
  const time = String(target.getHours()).padStart(2, "0") + ":" + String(target.getMinutes()).padStart(2, "0");
  return { time, day: localDateKey(target) === localDateKey(now) ? "today" : "tomorrow" };
}

export function parseLocalTime(value: string, day: ArrivalDay, now = new Date()): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  const target = new Date(now);
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
  if (!arrival || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;

  const buffer = Number.isFinite(bufferMinutes)
    ? Math.max(0, Math.min(180, Math.round(bufferMinutes)))
    : 0;
  const routeMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const departure = new Date(arrival.getTime() - durationSeconds * 1000 - buffer * 60_000);

  return {
    arrival,
    departure,
    routeMinutes,
    bufferMinutes: buffer,
    totalPlanningMinutes: routeMinutes + buffer,
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

export function departureMinutesDelta(departure: Date, now = new Date()) {
  return Math.round((departure.getTime() - now.getTime()) / 60_000);
}
