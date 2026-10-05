/** Screen-space groups keep dense catalogues readable without changing coordinates. */
export function mapMarkerGroups<T>(items: T[], project: (item: T) => { x: number; y: number }, keep: (item: T) => boolean, cell = 64) {
  const singles: T[] = [];
  const buckets = new Map<string, { items: T[]; sumX: number; sumY: number }>();
  for (const item of items) {
    if (keep(item)) {
      singles.push(item);
      continue;
    }
    const point = project(item);
    const key = Math.floor(point.x / cell) + ":" + Math.floor(point.y / cell);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.items.push(item);
      bucket.sumX += point.x;
      bucket.sumY += point.y;
    } else {
      buckets.set(key, { items: [item], sumX: point.x, sumY: point.y });
    }
  }
  const groups: Array<{ key: string; items: T[]; x: number; y: number }> = [];
  for (const [key, bucket] of buckets) {
    if (bucket.items.length === 1) {
      singles.push(bucket.items[0]);
      continue;
    }
    groups.push({
      key,
      items: bucket.items,
      x: bucket.sumX / bucket.items.length,
      y: bucket.sumY / bucket.items.length,
    });
  }
  return { singles, groups };
}
