export type TripProjectionInput = {
  oneWayDistanceKm: number;
  oneWayCost: number;
  roundTrip: boolean;
  tripsPerWeek: number;
  extraCostPerTrip?: number;
  recurring?: boolean;
};

export function projectTripCosts(input: TripProjectionInput) {
  const distanceMultiplier = input.roundTrip ? 2 : 1;
  const recurring = input.recurring !== false;
  const weeklyTrips = recurring ? Math.max(0, Math.min(21, Math.floor(input.tripsPerWeek))) : 0;
  const distanceKm = Math.max(0, input.oneWayDistanceKm) * distanceMultiplier;
  const fuelCostPerTrip = Math.max(0, input.oneWayCost) * distanceMultiplier;
  const extraCostPerTrip = Math.max(0, input.extraCostPerTrip ?? 0);
  const costPerTrip = fuelCostPerTrip + extraCostPerTrip;
  const costPerKm = distanceKm > 0 ? costPerTrip / distanceKm : 0;
  const weeklyCost = costPerTrip * weeklyTrips;
  const monthlyCost = weeklyCost * 4.33;
  const annualCost = monthlyCost * 12;

  return {
    recurring,
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

export type MonthlyBudgetStatus = {
  budget: number;
  monthlyCost: number;
  difference: number;
  usedPercent: number;
  withinBudget: boolean;
};

export function compareMonthlyBudget(monthlyCost: number, budget: number): MonthlyBudgetStatus | null {
  const normalizedCost = Math.max(0, monthlyCost);
  const normalizedBudget = Math.max(0, budget);
  if (!normalizedBudget) return null;
  return {
    budget: normalizedBudget,
    monthlyCost: normalizedCost,
    difference: normalizedBudget - normalizedCost,
    usedPercent: (normalizedCost / normalizedBudget) * 100,
    withinBudget: normalizedCost <= normalizedBudget,
  };
}

export type FuelStatus = {
  currentFuelLiters: number;
  tankLiters: number;
  fuelNeededToFill: number;
  fillCost: number;
  currentRangeKm: number;
  maxRangeKm: number;
  tripFuelNeeded: number;
  tripFitsOneTank: boolean;
  fuelShortfallLiters: number;
  minimumFuelCost: number;
  fuelNeededBeforeDeparture: number;
  departureFuelCost: number;
  additionalFuelDuringTripLiters: number;
  minimumRefuelStops: number;
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
  const maxRangeKm = tankLiters * kmPerLiter;
  const tripFuelNeeded = tripDistanceKm / kmPerLiter;
  const tripFitsOneTank = tripFuelNeeded <= tankLiters;
  const fuelShortfallLiters = Math.max(0, tripFuelNeeded - currentFuelLiters);
  const minimumFuelCost = fuelShortfallLiters * pricePerLiter;
  const fuelNeededBeforeDeparture = tripFitsOneTank ? fuelShortfallLiters : fuelNeededToFill;
  const departureFuelCost = fuelNeededBeforeDeparture * pricePerLiter;
  const additionalFuelDuringTripLiters = tripFitsOneTank ? 0 : Math.max(0, tripFuelNeeded - tankLiters);
  const minimumRefuelStops = tripFitsOneTank ? 0 : Math.max(1, Math.ceil(tripFuelNeeded / tankLiters) - 1);
  const fuelRemainingAfterTrip = currentFuelLiters - tripFuelNeeded;

  return {
    currentFuelLiters,
    tankLiters,
    fuelNeededToFill,
    fillCost,
    currentRangeKm,
    maxRangeKm,
    tripFuelNeeded,
    tripFitsOneTank,
    fuelShortfallLiters,
    minimumFuelCost,
    fuelNeededBeforeDeparture,
    departureFuelCost,
    additionalFuelDuringTripLiters,
    minimumRefuelStops,
    fuelRemainingAfterTrip,
    rangeRemainingAfterTripKm: Math.max(0, fuelRemainingAfterTrip) * kmPerLiter,
    canCompleteTrip: fuelRemainingAfterTrip >= 0,
  };
}

export function fuelLitersFromTankFraction(tankLiters: number, fraction: number) {
  const normalizedTank = Math.max(0, tankLiters);
  const normalizedFraction = Math.max(0, Math.min(1, fraction));
  return normalizedTank * normalizedFraction;
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
  recurring?: boolean;
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
    recurring: input.recurring,
  });
  const alternative = projectTripCosts({
    oneWayDistanceKm: distanceKm,
    oneWayCost: (distanceKm / alternativeConsumption) * alternativePrice,
    roundTrip: input.roundTrip,
    tripsPerWeek: input.tripsPerWeek,
    extraCostPerTrip: input.extraCostPerTrip,
    recurring: input.recurring,
  });

  return {
    baseline,
    alternative,
    differencePerTrip: baseline.costPerTrip - alternative.costPerTrip,
    differencePerMonth: baseline.monthlyCost - alternative.monthlyCost,
    differencePerYear: baseline.annualCost - alternative.annualCost,
  };
}


export type FuelChoiceComparison = {
  method: "real-cost-per-km" | "seventy-percent";
  recommended: "ethanol" | "gasoline" | "tie";
  ethanolCostPerKm: number | null;
  gasolineCostPerKm: number | null;
  ethanolPriceRatio: number;
};

export function compareEthanolGasoline(input: {
  ethanolPrice: number;
  gasolinePrice: number;
  ethanolKmPerLiter?: number;
  gasolineKmPerLiter?: number;
}): FuelChoiceComparison | null {
  const ethanolPrice = Math.max(0, input.ethanolPrice);
  const gasolinePrice = Math.max(0, input.gasolinePrice);
  if (!ethanolPrice || !gasolinePrice) return null;

  const ethanolConsumption = Math.max(0, input.ethanolKmPerLiter ?? 0);
  const gasolineConsumption = Math.max(0, input.gasolineKmPerLiter ?? 0);
  const ethanolPriceRatio = ethanolPrice / gasolinePrice;

  if (ethanolConsumption > 0 && gasolineConsumption > 0) {
    const ethanolCostPerKm = ethanolPrice / ethanolConsumption;
    const gasolineCostPerKm = gasolinePrice / gasolineConsumption;
    const difference = Math.abs(ethanolCostPerKm - gasolineCostPerKm);
    const tieThreshold = Math.min(ethanolCostPerKm, gasolineCostPerKm) * 0.005;
    return {
      method: "real-cost-per-km",
      recommended: difference <= tieThreshold
        ? "tie"
        : ethanolCostPerKm < gasolineCostPerKm ? "ethanol" : "gasoline",
      ethanolCostPerKm,
      gasolineCostPerKm,
      ethanolPriceRatio,
    };
  }

  return {
    method: "seventy-percent",
    recommended: Math.abs(ethanolPriceRatio - 0.7) <= 0.001
      ? "tie"
      : ethanolPriceRatio < 0.7 ? "ethanol" : "gasoline",
    ethanolCostPerKm: null,
    gasolineCostPerKm: null,
    ethanolPriceRatio,
  };
}
