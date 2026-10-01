import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublicRoutePayload, calculatePublicRoute } from "./publicRouting";

describe("public routing fallback", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ lat: "-15.7942", lon: "-47.8822" }]), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: "Ok",
              routes: [{ distance: 10123, duration: 845, geometry: "abc123" }],
            }),
            { status: 200 }
          )
        )
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("geocodes endpoints and calculates a route without the application backend", async () => {
    const route = await calculatePublicRoute(
      "Águas Lindas de Goiás, GO",
      "Brasília, DF"
    );
    expect(route.distanceMeters).toBe(10123);
    expect(route.durationSeconds).toBe(845);
    expect(route.polyline).toBe("abc123");
    expect(route.origin).toEqual({ lat: -15.7545, lng: -48.2816 });
  });

  it("falls back to a local estimate when the shared router is unavailable", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    const route = await calculatePublicRoute(
      "-15.7545,-48.2816",
      "-15.7942,-47.8822"
    );
    expect(route.source).toBe("local-estimate");
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.durationSeconds).toBeGreaterThan(0);
    expect(route.polyline.length).toBeGreaterThan(0);
  });

  it("geocodes a city-qualified address rather than silently routing to the centre", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: "-15.71", lon: "-48.25" }]))
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "Ok",
            routes: [{ distance: 900, duration: 180, geometry: "valid" }],
          })
        )
      );
    vi.stubGlobal("fetch", fetchMock);
    const route = await calculatePublicRoute(
      "-15.70,-48.20",
      "UPA Águas Lindas GO"
    );
    expect(route.destination).toEqual({ lat: -15.71, lng: -48.25 });
    expect(String(fetchMock.mock.calls[0][0])).toContain("nominatim");
  });

  it("expands a known local service name before geocoding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: "-15.779", lon: "-48.265" }]))
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "Ok",
            routes: [{ distance: 4200, duration: 520, geometry: "service-route" }],
          })
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    await calculatePublicRoute(
      "-15.7545,-48.2816",
      "Hospital Municipal Bom Jesus"
    );

    const firstUrl = String(fetchMock.mock.calls[0][0]);
    expect(decodeURIComponent(firstUrl)).toContain("Hospital Municipal Bom Jesus");
    expect(decodeURIComponent(firstUrl)).toContain("Águas Lindas de Goiás");
  });

  it("rejects origin and destination that resolve to the same point", async () => {
    await expect(
      calculatePublicRoute("-15.7545,-48.2816", "-15.7545,-48.2816")
    ).rejects.toThrow(/mesmo ponto/i);
  });

  it("recovers a road route after an estimate was cached during a network failure", async () => {
    const saved = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const args = ["-15.7,-48.2", "-15.8,-48.3"] as const;
    expect((await calculatePublicRoute(...args)).source).toBe("local-estimate");
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [{ distance: 10000, duration: 800, geometry: "road" }],
        })
      )
    );
    expect((await calculatePublicRoute(...args)).source).toBe("osrm");
  });

  it("ignores corrupt coordinate and route caches instead of propagating invalid data", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify({ lat: 999, lng: -48, source: "osrm" }),
      setItem: vi.fn(),
    });
    const route = await calculatePublicRoute(
      "Águas Lindas de Goiás, GO",
      "Brasília, DF"
    );
    expect(route.destination).toEqual({ lat: -15.7942, lng: -47.8822 });
    expect(route.source).toBe("osrm");
  });

  it("keeps coordinate routing available when accessing browser storage throws", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage"
    );
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("blocked storage");
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    try {
      expect(
        (await calculatePublicRoute("-15.7,-48.2", "-15.8,-48.3")).source
      ).toBe("local-estimate");
    } finally {
      if (descriptor)
        Object.defineProperty(globalThis, "localStorage", descriptor);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });

  it("turns the public route into the planner contract", () => {
    const payload = buildPublicRoutePayload({
      origin: { lat: -15.7, lng: -48.2 },
      destination: { lat: -15.8, lng: -47.9 },
      distanceMeters: 5000,
      durationSeconds: 600,
      polyline: "encoded",
      source: "osrm",
      mode: "driving",
    });
    expect(payload.route.distanceMeters).toBe(5000);
    expect(payload.route.durationSeconds).toBe(600);
    expect(payload.route.polyline).toBe("encoded");
    expect(payload.traffic.label).toContain("não disponível");
  });
});
