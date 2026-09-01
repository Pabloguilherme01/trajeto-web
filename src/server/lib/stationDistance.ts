import type { DistanceMatrixResult } from "../_core/map";

export type StationDistance = {
  distanceMeters: number | null;
  distanceLabel: string | null;
};

export function stationDistances(matrix: DistanceMatrixResult | null, count: number): StationDistance[] {
  return Array.from({ length: count }, (_, index) => {
    const element = matrix?.rows[0]?.elements[index];
    if (!element || element.status !== "OK") return { distanceMeters: null, distanceLabel: null };
    return { distanceMeters: element.distance.value, distanceLabel: element.distance.text };
  });
}

export function distanceMatrixBatches<T>(items: T[], maxDestinations = 12): T[][] {
  return Array.from({ length: Math.ceil(items.length / maxDestinations) }, (_, index) => items.slice(index * maxDestinations, (index + 1) * maxDestinations));
}

export function mergeStationDistances(matrices: Array<DistanceMatrixResult | null>, totalCount: number, maxDestinations = 12): StationDistance[] {
  return matrices.flatMap((matrix, batchIndex) => stationDistances(matrix, Math.min(maxDestinations, totalCount - batchIndex * maxDestinations))).slice(0, totalCount);
}
