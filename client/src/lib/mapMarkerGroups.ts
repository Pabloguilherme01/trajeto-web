/** Screen-space groups keep dense catalogues readable without changing coordinates. */
export function mapMarkerGroups<T>(items: T[], project: (item: T) => { x: number; y: number }, keep: (item: T) => boolean, cell = 64) {
  const singles: T[] = [];
  const buckets = new Map<string, Array<{ item: T; x: number; y: number }>>();
  for (const item of items) {
    if (keep(item)) { singles.push(item); continue; }
    const point = project(item);
    const key = Math.floor(point.x / cell) + ":" + Math.floor(point.y / cell);
    const bucket = buckets.get(key) ?? [];
    bucket.push({ item, ...point }); buckets.set(key, bucket);
  }
  const groups: Array<{ key: string; items: T[]; x: number; y: number }> = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length === 1) singles.push(bucket[0].item);
    else groups.push({ key, items: bucket.map(value => value.item), x: bucket.reduce((sum, value) => sum + value.x, 0) / bucket.length, y: bucket.reduce((sum, value) => sum + value.y, 0) / bucket.length });
  }
  return { singles, groups };
}
