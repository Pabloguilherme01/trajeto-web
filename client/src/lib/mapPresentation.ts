const priorities: Record<string, number> = { motorway: 6, trunk: 5, primary: 4, secondary: 3, tertiary: 2 };

/** Cartographic priority from the sourced OSM road type, including link roads. */
export function roadPriority(kind: string) {
  return priorities[kind.endsWith("_link") ? kind.slice(0, -5) : kind] ?? 1;
}
export function groundMetresPerPixel(worldY: number, scale: number) {
  const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * Math.max(0, Math.min(1, worldY)))));
  return 40075016.686 * Math.cos(latitude) / scale;
}

/** Cover the viewport with one tile of overscan; fractional zoom uses CSS scale. */
export function viewportTileBounds(center: { x: number; y: number }, width: number, height: number, scale: number) {
  return {
    minX: Math.floor((center.x - width / (2 * scale)) / 256) - 1,
    maxX: Math.floor((center.x + width / (2 * scale)) / 256) + 1,
    minY: Math.floor((center.y - height / (2 * scale)) / 256) - 1,
    maxY: Math.floor((center.y + height / (2 * scale)) / 256) + 1,
  };
}
