export type RouteDecisionMode = "balanced" | "fastest" | "cheapest" | "no-tolls";

export type RouteDecisionCandidate = {
  id: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  toll?: { amount: number | null } | null;
};

type Metric = (route: RouteDecisionCandidate) => number | null;

function finite(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function selectRouteForDecision<T extends RouteDecisionCandidate>(
  routes: T[],
  mode: RouteDecisionMode,
  fuelCost: (route: T) => number | null,
  totalCost: (route: T) => number | null,
): T | null {
  if (!routes.length) return null;

  if (mode === "fastest") {
    return [...routes].filter(route => finite(route.durationSeconds) != null)
      .sort((a, b) => Number(a.durationSeconds) - Number(b.durationSeconds))[0] ?? null;
  }
  if (mode === "cheapest") {
    return [...routes].filter(route => finite(totalCost(route)) != null)
      .sort((a, b) => Number(totalCost(a)) - Number(totalCost(b)))[0] ?? null;
  }
  if (mode === "no-tolls") {
    return [...routes].filter(route => finite(route.toll?.amount) === 0)
      .sort((a, b) => Number(a.durationSeconds ?? Infinity) - Number(b.durationSeconds ?? Infinity))[0] ?? null;
  }

  const metrics: Metric[] = [
    route => finite(route.durationSeconds),
    route => finite(route.distanceMeters),
  ];
  if (routes.every(route => finite(fuelCost(route)) != null)) metrics.push(route => finite(fuelCost(route as T)));
  if (routes.every(route => finite(route.toll?.amount) != null)) metrics.push(route => finite(route.toll?.amount));

  const comparable = metrics.filter(metric => routes.every(route => finite(metric(route)) != null));
  if (!comparable.length) return routes[0];

  const scores = routes.map(route => {
    const score = comparable.reduce((sum, metric) => {
      const values = routes.map(candidate => Number(metric(candidate)));
      const min = Math.min(...values);
      const max = Math.max(...values);
      return sum + (max === min ? 0 : (Number(metric(route)) - min) / (max - min));
    }, 0);
    return { route, score: score / comparable.length };
  });
  return scores.sort((a, b) => a.score - b.score)[0]?.route ?? null;
}
