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
  const costPerKm = distanceKm > 0 ? costPerTrip / distanceKm : 0;
  const weeklyCost = costPerTrip * weeklyTrips;
  const monthlyCost = weeklyCost * 4.33;
  const annualCost = monthlyCost * 12;

  return {
    distanceKm,
    fuelCostPerTrip,
    extraCostPerTrip,
    costPerTrip,
    costPerKm,
    weeklyCost,
    monthlyCost,
    annualCost,
  };
}



export type FuelStatus = {
  currentFuelLiters: number;
  tankLiters: number;
  fuelNeededToFill: number;
  fillCost: number;
  currentRangeKm: number;
  tripFuelNeeded: number;
  fuelRemainingAfterTrip: number;
  rangeRemainingAfterTripKm: number;
  canCompleteTrip: boolean;
};

export function calculateFuelStatus(input: {
  tankLiters: number;
  currentFuelLiters: number;
  pricePerLiter: number;
  kmPerLiter: number;
  tripDistanceKm: number;
}): FuelStatus | null {
  const tankLiters = Math.max(0, input.tankLiters);
  const currentFuelLiters = Math.max(0, Math.min(input.currentFuelLiters, tankLiters));
  const pricePerLiter = Math.max(0, input.pricePerLiter);
  const kmPerLiter = Math.max(0, input.kmPerLiter);
  const tripDistanceKm = Math.max(0, input.tripDistanceKm);

  if (!tankLiters || !kmPerLiter || !pricePerLiter) return null;

  const fuelNeededToFill = tankLiters - currentFuelLiters;
  const fillCost = fuelNeededToFill * pricePerLiter;
  const currentRangeKm = currentFuelLiters * kmPerLiter;
  const tripFuelNeeded = tripDistanceKm / kmPerLiter;
  const fuelRemainingAfterTrip = currentFuelLiters - tripFuelNeeded;

  return {
    currentFuelLiters,
    tankLiters,
    fuelNeededToFill,
    fillCost,
    currentRangeKm,
    tripFuelNeeded,
    fuelRemainingAfterTrip,
    rangeRemainingAfterTripKm: Math.max(0, fuelRemainingAfterTrip) * kmPerLiter,
    canCompleteTrip: fuelRemainingAfterTrip >= 0,
  };
}

export type TripScenarioComparison = {
  baseline: ReturnType<typeof projectTripCosts>;
  alternative: ReturnType<typeof projectTripCosts>;
  differencePerTrip: number;
  differencePerMonth: number;
  differencePerYear: number;
};

export function compareTripScenarios(input: {
  oneWayDistanceKm: number;
  baselinePricePerLiter: number;
  baselineKmPerLiter: number;
  alternativePricePerLiter: number;
  alternativeKmPerLiter: number;
  roundTrip: boolean;
  tripsPerWeek: number;
  extraCostPerTrip?: number;
}): TripScenarioComparison | null {
  const distanceKm = Math.max(0, input.oneWayDistanceKm);
  const baselinePrice = Math.max(0, input.baselinePricePerLiter);
  const baselineConsumption = Math.max(0, input.baselineKmPerLiter);
  const alternativePrice = Math.max(0, input.alternativePricePerLiter);
  const alternativeConsumption = Math.max(0, input.alternativeKmPerLiter);

  if (!distanceKm || !baselinePrice || !baselineConsumption || !alternativePrice || !alternativeConsumption) {
    return null;
  }

  const baseline = projectTripCosts({
    oneWayDistanceKm: distanceKm,
    oneWayCost: (distanceKm / baselineConsumption) * baselinePrice,
    roundTrip: input.roundTrip,
    tripsPerWeek: input.tripsPerWeek,
    extraCostPerTrip: input.extraCostPerTrip,
  });
  const alternative = projectTripCosts({
    oneWayDistanceKm: distanceKm,
    oneWayCost: (distanceKm / alternativeConsumption) * alternativePrice,
    roundTrip: input.roundTrip,
    tripsPerWeek: input.tripsPerWeek,
    extraCostPerTrip: input.extraCostPerTrip,
  });

  return {
    baseline,
    alternative,
    differencePerTrip: baseline.costPerTrip - alternative.costPerTrip,
    differencePerMonth: baseline.monthlyCost - alternative.monthlyCost,
    differencePerYear: baseline.annualCost - alternative.annualCost,
  };
}
