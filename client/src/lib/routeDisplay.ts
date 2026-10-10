/**
 * Pure route presentation helpers kept outside the large Planner screen.
 * These do not read or store private route/location data.
 */
export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds === 0) return "0 min";
  const total = Math.max(1, Math.round(seconds / 60));
  if (total >= 60) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return minutes ? hours + "h " + minutes + "min" : hours + "h";
  }
  return total + " min";
}

export function formatDistance(meters: number | null | undefined) {
  if (meters == null || !Number.isFinite(meters)) return "—";
  return meters >= 1000
    ? (meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km"
    : Math.round(meters).toLocaleString("pt-BR") + " m";
}

// Reuse the locale formatter rather than constructing it on each render.
const arrivalTimeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function formatArrival(seconds: number | null | undefined, now = Date.now()) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  return arrivalTimeFormatter.format(new Date(now + seconds * 1000));
}
