import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRouteIntelligence } from "./routeIntelligence";

describe("route intelligence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("returns traffic, toll and alternatives data from the server adapter", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      provider: "google-routes",
      generatedAt: "2026-09-28T00:00:00.000Z",
      trafficAware: true,
      alternativesAvailable: true,
      routes: [{
        id: "principal",
        distanceMeters: 12000,
        durationSeconds: 900,
        staticDurationSeconds: 720,
        fuelConsumptionLiters: 1.8,
        toll: { amount: 8.5, currency: "BRL", estimated: true },
      }],
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await fetchRouteIntelligence({
      origin: "Casa",
      destination: "Trabalho",
      avoidTolls: false,
    });

    expect(result.routes[0].toll?.amount).toBe(8.5);
    expect(result.routes[0].fuelConsumptionLiters).toBe(1.8);
    expect(result.trafficAware).toBe(true);
  });

  it("exposes a configuration error without inventing route data", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      error: "routing_provider_not_configured",
      message: "O provedor de rotas ainda não está configurado no servidor.",
    }), { status: 503 }));

    await expect(fetchRouteIntelligence({ origin: "Casa", destination: "Trabalho" })).rejects.toMatchObject({
      code: "routing_provider_not_configured",
    });
  });
});
