import { describe, expect, it } from "vitest";
import { selectRouteForDecision, type RouteDecisionCandidate } from "./routeDecision";

type Candidate = RouteDecisionCandidate & { fuel: number | null; total: number | null };
const fuel = (route: Candidate) => route.fuel;
const total = (route: Candidate) => route.total;

describe("selectRouteForDecision", () => {
  const routes: Candidate[] = [
    { id: "fast", durationSeconds: 1200, distanceMeters: 200000, toll: { amount: 10 }, fuel: 20, total: 30 },
    { id: "cheap", durationSeconds: 2400, distanceMeters: 100000, toll: { amount: 0 }, fuel: 10, total: 10 },
    { id: "balanced", durationSeconds: 1440, distanceMeters: 120000, toll: { amount: 2 }, fuel: 12, total: 14 },
  ];

  it("ranks a compromise across comparable time, distance, fuel and toll values", () => {
    expect(selectRouteForDecision(routes, "balanced", fuel, total)?.id).toBe("balanced");
  });
  it("requires complete cost data for the cheapest preset", () => {
    expect(selectRouteForDecision(routes, "cheapest", fuel, total)?.id).toBe("cheap");
    expect(selectRouteForDecision([{ ...routes[0], total: null }], "cheapest", fuel, total)).toBeNull();
  });
  it("does not call unknown tolls toll-free", () => {
    expect(selectRouteForDecision([{ ...routes[0], toll: { amount: null } }], "no-tolls", fuel, total)).toBeNull();
  });
  it("preserves provider order when balanced metrics tie", () => {
    const equal = routes.map(route => ({ ...route, durationSeconds: 60, distanceMeters: 1000, fuel: 2, toll: { amount: 1 } }));
    expect(selectRouteForDecision(equal, "balanced", fuel, total)?.id).toBe("fast");
  });
});
