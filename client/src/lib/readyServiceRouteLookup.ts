/**
 * Resolve requested ready-route IDs from a snapshot without repeatedly
 * scanning the full city destination list. Keep the first route for a
 * duplicate ID to match Array.find and keep the requested order.
 */
export function selectExistingRoutesById<T extends { id: string }>(
  destinations: readonly T[],
  routeIds: readonly string[],
): T[] {
  const byId = new Map<string, T>();
  for (const destination of destinations) {
    if (!byId.has(destination.id)) byId.set(destination.id, destination);
  }
  const result: T[] = [];
  for (const id of routeIds) {
    const route = byId.get(id);
    if (route) result.push(route);
  }
  return result;
}
