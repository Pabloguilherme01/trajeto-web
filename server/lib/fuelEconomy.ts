export type FuelEconomyInput = {
  distanceKm: number;
  pricePerLiter: number;
  kmPerLiter: number;
  tankLiters?: number | null;
};

export type FuelComparisonInput = {
  distanceKm: number;
  gasolinePrice: number;
  ethanolPrice: number;
  gasolineKmPerLiter: number;
  ethanolKmPerLiter: number;
  tankLiters?: number | null;
};

export function calculateFuelEconomy(input: FuelEconomyInput) {
  if (!Number.isFinite(input.distanceKm) || input.distanceKm < 0) throw new Error("A distância deve ser válida.");
  if (!Number.isFinite(input.pricePerLiter) || input.pricePerLiter <= 0) throw new Error("O preço por litro deve ser maior que zero.");
  if (!Number.isFinite(input.kmPerLiter) || input.kmPerLiter <= 0) throw new Error("O consumo deve ser maior que zero.");
  const litersNeeded = input.distanceKm / input.kmPerLiter;
  const tripCost = litersNeeded * input.pricePerLiter;
  const autonomyKm = input.tankLiters && input.tankLiters > 0 ? input.tankLiters * input.kmPerLiter : null;
  const refuelsNeeded = autonomyKm ? Math.max(0, Math.ceil(input.distanceKm / autonomyKm) - 1) : null;
  return {
    distanceKm: Number(input.distanceKm.toFixed(1)),
    litersNeeded: Number(litersNeeded.toFixed(2)),
    tripCost: Number(tripCost.toFixed(2)),
    roundTripCost: Number((tripCost * 2).toFixed(2)),
    costPerKm: Number((input.pricePerLiter / input.kmPerLiter).toFixed(3)),
    autonomyKm: autonomyKm ? Number(autonomyKm.toFixed(1)) : null,
    refuelsNeeded,
  };
}

export function compareFuelPrices(input: FuelComparisonInput) {
  const gasoline = calculateFuelEconomy({ distanceKm: input.distanceKm, pricePerLiter: input.gasolinePrice, kmPerLiter: input.gasolineKmPerLiter, tankLiters: input.tankLiters });
  const ethanol = calculateFuelEconomy({ distanceKm: input.distanceKm, pricePerLiter: input.ethanolPrice, kmPerLiter: input.ethanolKmPerLiter, tankLiters: input.tankLiters });
  const breakEvenEthanolPrice = input.gasolinePrice * (input.ethanolKmPerLiter / input.gasolineKmPerLiter);
  const recommendedFuel: "gasoline" | "ethanol" = ethanol.tripCost < gasoline.tripCost ? "ethanol" : "gasoline";
  const savings = Math.abs(gasoline.tripCost - ethanol.tripCost);
  return {
    gasoline,
    ethanol,
    recommendedFuel,
    savings: Number(savings.toFixed(2)),
    breakEvenEthanolPrice: Number(breakEvenEthanolPrice.toFixed(3)),
    reason: recommendedFuel === "ethanol"
      ? `Etanol custa ${savings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} menos nesta rota com os consumos informados.`
      : `Gasolina custa ${savings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} menos nesta rota com os consumos informados.`,
  };
}
