import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublicRoutePayload, calculatePrivateLocationRoute, calculatePublicRoute, publicGeocoderWaitMs } from "./publicRouting";

describe("public routing fallback", () => {
  beforeEach(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}

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
  afterEach(() => {
    vi.unstubAllGlobals();
    try {
      localStorage.removeItem("trajeto-aguas-lindas-anp-offline-v1");
    } catch {}
  });

  it("calculates the provider wait budget without exceeding one request per second", () => {
    expect(publicGeocoderWaitMs(1_000, 1_500)).toBe(600);
    expect(publicGeocoderWaitMs(1_000, 2_100)).toBe(0);
    expect(publicGeocoderWaitMs(0, 1_500)).toBe(0);
  });

  it("deduplicates identical geocoder work while a request is in flight", async () => {
    let resolveGeocoder: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((url: string | URL | Request) => {
      const value = String(url);
      if (value.includes("nominatim")) {
        return new Promise<Response>(resolve => {
          resolveGeocoder = resolve;
        });
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            code: "Ok",
            routes: [{ distance: 2100, duration: 240, geometry: "shared" }],
          }),
          { status: 200 }
        )
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = calculatePublicRoute(
      "-15.7545,-48.2816",
      "Destino concorrente de teste"
    );
    const second = calculatePublicRoute(
      "-15.7545,-48.2816",
      "Destino concorrente de teste"
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(
      fetchMock.mock.calls.filter(call => String(call[0]).includes("nominatim"))
    ).toHaveLength(1);

    resolveGeocoder?.(
      new Response(JSON.stringify([{ lat: "-15.79", lon: "-48.24" }]), {
        status: 200,
      })
    );

    await Promise.all([first, second]);
    expect(
      fetchMock.mock.calls.filter(call => String(call[0]).includes("nominatim"))
    ).toHaveLength(1);
  });

  it("geocodes endpoints and calculates a route without the application backend", async () => {
    const route = await calculatePublicRoute(
      "Águas Lindas de Goiás, GO",
      "Brasília, DF"
    );
    const requestOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(requestOptions).toMatchObject({
      credentials: "omit",
      referrerPolicy: "origin",
      cache: "no-store",
    });
    expect(route.distanceMeters).toBe(10123);
    expect(route.durationSeconds).toBe(845);
    expect(route.polyline).toBe("abc123");
    expect(route.origin).toEqual({ lat: -15.7545, lng: -48.2816 });
  });

  it("never sends the GPS origin to an online route provider", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: "-15.7942", lon: "-47.8822" }]), {
          status: 200,
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const route = await calculatePrivateLocationRoute(
      "-15.76123, -48.28123",
      "Brasília, DF",
      "driving"
    );

    expect(route.source).toBe("local-estimate");
    expect(route.origin).toEqual({ lat: -15.761, lng: -48.281 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const onlyUrl = String(fetchMock.mock.calls[0][0]);
    expect(onlyUrl).toContain("nominatim");
    expect(onlyUrl).not.toContain("-15.76123");
    expect(onlyUrl).not.toContain("-48.28123");
    expect(onlyUrl).not.toContain("router.project-osrm.org");
  });

  it("does not call the public geocoder while the device is offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      calculatePublicRoute(
        "-15.7545,-48.2816",
        "Destino ainda não preparado offline"
      )
    ).rejects.toThrow(/não está disponível offline/i);

    expect(fetchMock).not.toHaveBeenCalled();
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

    const firstUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(firstUrl.searchParams.get("q")).toContain("Hospital Municipal Bom Jesus");
    expect(firstUrl.searchParams.get("q")).toContain("Águas Lindas de Goiás");
  });

  it("resolves a prepared ANP station from local storage when the network is unavailable", async () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
      clear: () => saved.clear(),
      key: () => null,
      length: 0,
    };
    vi.stubGlobal("window", { localStorage: storage });
    storage.setItem(
      "trajeto-aguas-lindas-anp-offline-v1",
      JSON.stringify({
        retrievedAt: "2026-10-01T12:00:00.000Z",
        savedAt: "2026-10-01T12:00:00.000Z",
        rows: [{
          cnpj: "13902675000178",
          razaoSocial: "AGUAS LINDAS COMBUSTIVEIS LTDA",
          endereco: "QUADRA 07",
          bairro: "CAMPING CLUBE",
          municipio: "AGUAS LINDAS DE GOIAS",
          uf: "GO",
          latitude: "-15.7646021",
          longitude: "-48.2677716",
        }],
      })
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const route = await calculatePublicRoute(
      "-15.7545,-48.2816",
      "AGUAS LINDAS COMBUSTIVEIS LTDA"
    );

    expect(route.destination.lat).toBeCloseTo(-15.7646021, 6);
    expect(route.destination.lng).toBeCloseTo(-48.2677716, 6);
    expect(route.source).toBe("local-estimate");
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
