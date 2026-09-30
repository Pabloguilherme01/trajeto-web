import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublicRoutePayload, calculatePublicRoute } from "./publicRouting";

describe("public routing fallback", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ lat: "-15.7545", lon: "-48.2816" }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ lat: "-15.7942", lon: "-47.8822" }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: "Ok",
        routes: [{ distance: 10123, duration: 845, geometry: "abc123" }],
      }), { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("geocodes endpoints and calculates a route without the application backend", async () => {
    const route = await calculatePublicRoute("Águas Lindas de Goiás, GO", "Brasília, DF");
    expect(route.distanceMeters).toBe(10123);
    expect(route.durationSeconds).toBe(845);
    expect(route.polyline).toBe("abc123");
    expect(route.origin).toEqual({ lat: -15.7545, lng: -48.2816 });
  });

  it("turns the public route into the planner contract", () => {
    const payload = buildPublicRoutePayload({
      origin: { lat: -15.7, lng: -48.2 },
      destination: { lat: -15.8, lng: -47.9 },
      distanceMeters: 5000,
      durationSeconds: 600,
      polyline: "encoded",
    });
    expect(payload.route.distanceMeters).toBe(5000);
    expect(payload.route.durationSeconds).toBe(600);
    expect(payload.route.polyline).toBe("encoded");
    expect(payload.traffic.label).toContain("não disponível");
  });
});
