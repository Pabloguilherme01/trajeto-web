export type TripProjectionInput = {
  oneWayDistanceKm: number;
  oneWayCost: number;
  roundTrip: boolean;
  tripsPerWeek: number;
  extraCostPerTrip?: number;
};

export function projectTripCosts(input: TripProjectionInput) {
  const distanceMultiplier = input.roundTrip ? 2 : 1;
  const weeklyTrips = Math.max(0, Math.min(21, Math.floor(input.tripsPerWeek)));
  const distanceKm = Math.max(0, input.oneWayDistanceKm) * distanceMultiplier;
  const fuelCostPerTrip = Math.max(0, input.oneWayCost) * distanceMultiplier;
  const extraCostPerTrip = Math.max(0, input.extraCostPerTrip ?? 0);
  const costPerTrip = fuelCostPerTrip + extraCostPerTrip;
  const weeklyCost = costPerTrip * weeklyTrips;
  const monthlyCost = weeklyCost * 4.33;
  const annualCost = monthlyCost * 12;

  return {
    distanceKm,
    fuelCostPerTrip,
    extraCostPerTrip,
    costPerTrip,
    weeklyCost,
    monthlyCost,
    annualCost,
  };
}
