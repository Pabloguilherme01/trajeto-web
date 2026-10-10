export type MapPoint = { lat: number; lng: number };

export function isMapPoint(point?: MapPoint | null): point is MapPoint {
  return Boolean(
    point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}

/** Reject truncated/invalid provider geometry rather than drawing a false route. */
export function decodeMapPolyline(encoded: string): MapPoint[] {
  if (encoded.length > 500_000) return [];
  let index = 0,
    lat = 0,
    lng = 0;
  const points: MapPoint[] = [];
  const read = () => {
    let result = 0,
      shift = 0;
    while (index < encoded.length && shift <= 30) {
      const byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) return null;
      result |= (byte & 31) << shift;
      if (byte < 32) return result & 1 ? ~(result >>> 1) : result >>> 1;
      shift += 5;
    }
    return null;
  };
  while (index < encoded.length) {
    const a = read(),
      b = read();
    if (a === null || b === null) return [];
    lat += a;
    lng += b;
    const point = { lat: lat / 1e5, lng: lng / 1e5 };
    if (!isMapPoint(point)) return [];
    points.push(point);
  }
  return points.length >= 2 ? points : [];
}


/**
 * Broad operational bounds used only to validate data that claims to belong
 * to the local Águas Lindas catalogue. Manual coordinates remain global.
 */
export function isAguasLindasRoutePoint(point?: MapPoint | null): point is MapPoint {
  return Boolean(
    isMapPoint(point) &&
    point.lat > -16.1 &&
    point.lat < -15.3 &&
    point.lng > -48.7 &&
    point.lng < -47.9
  );
}


export type MapPointBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/**
 * Scan any route length with constant auxiliary memory. Avoid Math.min(...arr)
 * and four temporary arrays: the spread can overflow the JS argument limit
 * when imported route geometry has tens of thousands of points.
 */
export function mapPointBounds(
  points: readonly MapPoint[],
  extraPoint?: MapPoint | null,
): MapPointBounds | null {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  const include = (point: MapPoint) => {
    if (!isMapPoint(point)) return;
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  };
  for (const point of points) include(point);
  if (extraPoint) include(extraPoint);
  return Number.isFinite(minLat) ? { minLat, maxLat, minLng, maxLng } : null;
}
