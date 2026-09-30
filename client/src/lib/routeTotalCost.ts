export type RouteTotalCostInput = {
  distanceKm: number;
  consumptionKmPerLiter: number | null;
  fuelPricePerLiter: number | null;
  tollAmount: number | null;
  roundTrip: boolean;
};

export type RouteTotalCost = {
  distanceKm: number;
  liters: number | null;
  fuelCost: number | null;
  tollCost: number | null;
  totalCost: number | null;
  costPerKm: number | null;
};

function validPositive(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

export function calculateRouteTotalCost(input: RouteTotalCostInput): RouteTotalCost {
  const baseDistance = validPositive(input.distanceKm) ?? 0;
  const multiplier = input.roundTrip ? 2 : 1;
  const distanceKm = baseDistance * multiplier;
  const consumption = validPositive(input.consumptionKmPerLiter);
  const fuelPrice = validPositive(input.fuelPricePerLiter);
  const toll = validPositive(input.tollAmount);

  const liters = consumption ? distanceKm / consumption : null;
  const fuelCost = liters != null && fuelPrice != null ? liters * fuelPrice : null;
  const tollCost = toll != null ? toll * multiplier : input.tollAmount === 0 ? 0 : null;
  const totalCost = fuelCost != null && tollCost != null
    ? fuelCost + tollCost
    : fuelCost != null && input.tollAmount == null
      ? fuelCost
      : tollCost != null && fuelCost == null
        ? tollCost
        : null;
  const costPerKm = totalCost != null && distanceKm > 0 ? totalCost / distanceKm : null;

  return { distanceKm, liters, fuelCost, tollCost, totalCost, costPerKm };
}
