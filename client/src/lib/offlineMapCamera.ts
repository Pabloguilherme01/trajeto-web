export type WorldPoint = { x: number; y: number };

/** Reserve space for the pin tips, endpoint labels and floating controls. */
export function fitOfflineMapCamera(points: readonly WorldPoint[], width: number, height: number, zoom: number) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const left = 44, right = 80, top = Math.min(160, height * 0.45), bottom = 64;
  const baseScale = Math.min(
    Math.max(1, width - left - right) / Math.max(maxX - minX, 0.00004),
    Math.max(1, height - top - bottom) / Math.max(maxY - minY, 0.00004),
  );
  return {
    x: (minX + maxX) / 2 - (left - right) / (2 * baseScale),
    y: (minY + maxY) / 2 - (top - bottom) / (2 * baseScale),
    scale: baseScale * zoom,
  };
}
