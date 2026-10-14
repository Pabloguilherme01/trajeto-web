export type WorldPoint = { x: number; y: number };

/** Reserve space for the pin tips, endpoint labels and floating controls. */
export function fitOfflineMapCamera(points: readonly WorldPoint[], width: number, height: number, zoom: number, reserveRouteControls = true) {
  // A camera can briefly receive unmeasured dimensions or an incomplete
  // projection during map initialization. Never propagate NaN to SVG/CSS.
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  // No valid destination yet. Return a finite neutral camera; a subsequent
  // valid point always replaces this temporary viewport.
  if (minX === Infinity) return { x: 0, y: 0, scale: 1 };
  if (!reserveRouteControls) {
    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      scale: Math.min(Math.max(1, safeWidth - 70) / Math.max(maxX - minX, 0.00004),
        Math.max(1, safeHeight - 100) / Math.max(maxY - minY, 0.00004)) * safeZoom,
    };
  }
  const left = 44, right = 80, top = Math.min(160, safeHeight * 0.45), bottom = 64;
  // About 240 m at the equator: keep short trips readable without an
  // unbounded zoom when the endpoints coincide. Catalogue fitting stays wider.
  const minimumTripSpan = 0.000006;
  const baseScale = Math.min(
    Math.max(1, safeWidth - left - right) / Math.max(maxX - minX, minimumTripSpan),
    Math.max(1, safeHeight - top - bottom) / Math.max(maxY - minY, minimumTripSpan),
  );
  return {
    x: (minX + maxX) / 2 - (left - right) / (2 * baseScale),
    y: (minY + maxY) / 2 - (top - bottom) / (2 * baseScale),
    scale: baseScale * safeZoom,
  };
}
