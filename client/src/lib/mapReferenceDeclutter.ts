/** 
 * Declutter supplementary reference markers without hiding route endpoints,
 * GPS or other primary markers. Retains the input order and the same strict
 * pixel-distance threshold as the previous full occupied-list scan.
 */
export function declutterMapReferences<T>(
  items: readonly T[],
  project: (item: T) => { x: number; y: number },
  isReference: (item: T) => boolean,
  minDistance = 44,
): T[] {
  if (!(minDistance > 0) || !Number.isFinite(minDistance)) return [...items];
  const buckets = new Map<string, Array<{ x: number; y: number }>>();
  const cell = (value: number) => Math.floor(value / minDistance);
  const add = (point: { x: number; y: number }) => {
    const key = cell(point.x) + ":" + cell(point.y);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(point);
    else buckets.set(key, [point]);
  };
  // Primary markers always win even if they appear later in the catalogue.
  for (const item of items) {
    if (!isReference(item)) add(project(item));
  }
  const output: T[] = [];
  const squared = minDistance * minDistance;
  for (const item of items) {
    if (!isReference(item)) {
      output.push(item);
      continue;
    }
    const point = project(item);
    const gx = cell(point.x);
    const gy = cell(point.y);
    let overlaps = false;
    for (let dx = -1; dx <= 1 && !overlaps; dx++) {
      for (let dy = -1; dy <= 1 && !overlaps; dy++) {
        for (const occupied of buckets.get((gx + dx) + ":" + (gy + dy)) ?? []) {
          const x = point.x - occupied.x;
          const y = point.y - occupied.y;
          if (x * x + y * y < squared) {
            overlaps = true;
            break;
          }
        }
      }
    }
    if (!overlaps) {
      output.push(item);
      add(point);
    }
  }
  return output;
}
