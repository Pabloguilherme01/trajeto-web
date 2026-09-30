export type RouteDecisionValue = {
  deltaCost: number | null;
  deltaMinutes: number | null;
  timeCost: number | null;
  combinedDelta: number | null;
};

export function calculateRouteDecisionValue(
  deltaCost: number | null,
  deltaMinutes: number | null,
  valueOfTimePerHour: number,
): RouteDecisionValue {
  const validTimeValue = Number.isFinite(valueOfTimePerHour) && valueOfTimePerHour > 0 ? valueOfTimePerHour : 0;
  const timeCost = deltaMinutes != null && validTimeValue > 0 ? (deltaMinutes / 60) * validTimeValue : null;
  const combinedDelta = deltaCost != null
    ? deltaCost + (timeCost ?? 0)
    : null;

  return { deltaCost, deltaMinutes, timeCost, combinedDelta };
}
