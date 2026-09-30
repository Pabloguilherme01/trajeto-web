export type MobilityForecastInput = {
  oneWayDistanceKm: number;
  oneWayTripCost: number;
  tripsPerWeek: number;
  roundTrip: boolean;
  fuelPricePerLiter: number | null;
  monthlyBudget: number | null;
};

export type MobilityForecast = {
  distancePerTripKm: number;
  costPerTrip: number;
  litersPerTrip: number | null;
  weeklyCost: number;
  monthlyCost: number;
  annualCost: number;
  monthlyDistanceKm: number;
  monthlyLiters: number | null;
  costPerKm: number | null;
  budgetPercent: number | null;
  budgetRemaining: number | null;
};

const WEEKS_PER_MONTH = 52 / 12;

function positive(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function projectMobilityForecast(input: MobilityForecastInput): MobilityForecast {
  const distance = positive(input.oneWayDistanceKm);
  const oneWayCost = positive(input.oneWayTripCost);
  const trips = Math.max(0, Math.min(21, Math.round(input.tripsPerWeek)));
  const multiplier = input.roundTrip ? 2 : 1;
  const distancePerTripKm = distance * multiplier;
  const costPerTrip = oneWayCost * multiplier;
  const weeklyCost = costPerTrip * trips;
  const monthlyCost = weeklyCost * WEEKS_PER_MONTH;
  const annualCost = weeklyCost * 52;
  const monthlyDistanceKm = distancePerTripKm * trips * WEEKS_PER_MONTH;
  const litersPerTrip = input.fuelPricePerLiter && input.fuelPricePerLiter > 0
    ? costPerTrip / input.fuelPricePerLiter
    : null;
  const monthlyLiters = litersPerTrip == null ? null : litersPerTrip * trips * WEEKS_PER_MONTH;
  const costPerKm = distancePerTripKm > 0 ? costPerTrip / distancePerTripKm : null;
  const budget = positive(input.monthlyBudget);

  return {
    distancePerTripKm,
    costPerTrip,
    litersPerTrip,
    weeklyCost,
    monthlyCost,
    annualCost,
    monthlyDistanceKm,
    monthlyLiters,
    costPerKm,
    budgetPercent: budget > 0 ? (monthlyCost / budget) * 100 : null,
    budgetRemaining: budget > 0 ? budget - monthlyCost : null,
  };
}
