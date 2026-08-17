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
