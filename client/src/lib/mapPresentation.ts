/** Cartographic priority from the sourced OSM road type, including link roads. */
export function roadPriority(kind: string) {
  return ({ motorway: 6, trunk: 5, primary: 4, secondary: 3, tertiary: 2 } as Record<string, number>)[kind.replace(/_link$/, "")] ?? 1;
}
export function groundMetresPerPixel(worldY: number, scale: number) {
  const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * Math.max(0, Math.min(1, worldY)))));
  return 40075016.686 * Math.cos(latitude) / scale;
}
