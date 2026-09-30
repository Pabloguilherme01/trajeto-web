export type RouteSensitivityInput = {
  distanceKm: number | null;
  tollAmount: number | null;
  consumptionKmPerLiter: number;
};

export function routeCostAtFuelPrice(
  route: RouteSensitivityInput,
  fuelPricePerLiter: number,
): number | null {
  const distance = route.distanceKm;
  const consumption = route.consumptionKmPerLiter;
  if (
    distance == null ||
    !Number.isFinite(distance) ||
    distance < 0 ||
    !Number.isFinite(consumption) ||
    consumption <= 0 ||
    !Number.isFinite(fuelPricePerLiter) ||
    fuelPricePerLiter <= 0 ||
    route.tollAmount == null ||
    !Number.isFinite(route.tollAmount) ||
    route.tollAmount < 0
  ) {
    return null;
  }

  return (distance / consumption) * fuelPricePerLiter + route.tollAmount;
}

export function calculateFuelBreakEvenPrice(
  baseline: RouteSensitivityInput,
  alternative: RouteSensitivityInput,
): number | null {
  if (
    baseline.tollAmount == null ||
    alternative.tollAmount == null ||
    !Number.isFinite(baseline.tollAmount) ||
    !Number.isFinite(alternative.tollAmount) ||
    baseline.distanceKm == null ||
    alternative.distanceKm == null ||
    !Number.isFinite(baseline.distanceKm) ||
    !Number.isFinite(alternative.distanceKm) ||
    baseline.distanceKm === alternative.distanceKm ||
    !Number.isFinite(baseline.consumptionKmPerLiter) ||
    baseline.consumptionKmPerLiter <= 0
  ) {
    return null;
  }

  const distanceDelta = alternative.distanceKm - baseline.distanceKm;
  const tollDelta = alternative.tollAmount - baseline.tollAmount;
  const price = -tollDelta * baseline.consumptionKmPerLiter / distanceDelta;

  return Number.isFinite(price) && price > 0 ? price : null;
}
