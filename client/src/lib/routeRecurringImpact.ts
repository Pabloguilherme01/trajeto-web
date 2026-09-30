export type RecurringRouteImpact = {
  weeklyDelta: number;
  monthlyDelta: number;
  annualDelta: number;
  monthlyMinutesDelta: number | null;
  costPerMinuteSaved: number | null;
};

const WEEKS_PER_MONTH = 52 / 12;

export function calculateRecurringRouteImpact(
  deltaCostPerTrip: number | null,
  deltaMinutesPerTrip: number | null,
  tripsPerWeek: number,
): RecurringRouteImpact | null {
  const trips = Number.isFinite(tripsPerWeek) ? Math.min(14, Math.max(1, Math.round(tripsPerWeek))) : 0;
  if (!trips || deltaCostPerTrip == null || !Number.isFinite(deltaCostPerTrip)) return null;

  const weeklyDelta = deltaCostPerTrip * trips;
  const monthlyDelta = weeklyDelta * WEEKS_PER_MONTH;
  const annualDelta = weeklyDelta * 52;
  const monthlyMinutesDelta = deltaMinutesPerTrip != null && Number.isFinite(deltaMinutesPerTrip)
    ? deltaMinutesPerTrip * trips * WEEKS_PER_MONTH
    : null;
  const costPerMinuteSaved = deltaMinutesPerTrip != null && deltaMinutesPerTrip < 0
    ? Math.abs(deltaCostPerTrip) / Math.abs(deltaMinutesPerTrip)
    : null;

  return { weeklyDelta, monthlyDelta, annualDelta, monthlyMinutesDelta, costPerMinuteSaved };
}
