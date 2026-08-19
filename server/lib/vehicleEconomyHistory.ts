export type VehicleEconomyRecord = {
  vehicleId: number | null;
  vehicleNickname: string | null;
  createdAt: Date;
  distanceMeters: number;
  gasolinePrice: string | null;
  ethanolPrice: string | null;
  gasolineKmPerLiter: string | null;
  ethanolKmPerLiter: string | null;
  estimatedTripCost: string | null;
};

export function toVehicleEconomyHistory(records: VehicleEconomyRecord[]) {
  return records.flatMap(row => {
    const distanceKm = row.distanceMeters / 1_000;
    const gasolinePrice = Number(row.gasolinePrice);
    const ethanolPrice = Number(row.ethanolPrice);
    const gasolineKmPerLiter = Number(row.gasolineKmPerLiter);
    const ethanolKmPerLiter = Number(row.ethanolKmPerLiter);
    if (!row.vehicleId || !Number.isFinite(gasolinePrice) || !Number.isFinite(ethanolPrice) || !Number.isFinite(gasolineKmPerLiter) || !Number.isFinite(ethanolKmPerLiter) || gasolinePrice <= 0 || ethanolPrice <= 0 || gasolineKmPerLiter <= 0 || ethanolKmPerLiter <= 0) return [];
    const gasolineCost = distanceKm / gasolineKmPerLiter * gasolinePrice;
    const ethanolCost = distanceKm / ethanolKmPerLiter * ethanolPrice;
    return [{ vehicleId: row.vehicleId, vehicleNickname: row.vehicleNickname || `Veículo ${row.vehicleId}`, createdAt: row.createdAt, distanceKm, gasolineCost, ethanolCost, estimatedSavings: Math.abs(gasolineCost - ethanolCost), bestFuel: gasolineCost <= ethanolCost ? "gasoline" as const : "ethanol" as const, estimatedTripCost: row.estimatedTripCost == null ? null : Number(row.estimatedTripCost) }];
  }).reverse();
}
