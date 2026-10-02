import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublicRoutePayload, calculateOfflineRoute, calculatePrivateLocationRoute, calculatePublicRoute, publicGeocoderWaitMs, resetPublicRoutingTestState } from "./publicRouting";

describe("public routing fallback", () => {
  beforeEach(() => {
    resetPublicRoutingTestState();
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

  it("opens a cooldown after a public geocoder failure so different searches do not hammer the provider", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("provider down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      calculatePublicRoute("-15.7545,-48.2816", "Destino falho A")
    ).rejects.toThrow(/não foi possível localizar/i);
    await expect(
      calculatePublicRoute("-15.7545,-48.2816", "Destino falho B")
    ).rejects.toThrow(/não foi possível localizar/i);

    expect(
      fetchMock.mock.calls.filter(call => String(call[0]).includes("nominatim"))
    ).toHaveLength(1);
  });

  it("uses at most one public geocoder request for an unknown destination", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      calculatePublicRoute(
        "-15.7545,-48.2816",
        "Destino desconhecido sem cadastro local"
      )
    ).rejects.toThrow(/não foi possível localizar/i);

    expect(
      fetchMock.mock.calls.filter(call => String(call[0]).includes("nominatim"))
    ).toHaveLength(1);
  });

  it("uses prepared city coordinates before the public geocoder", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [{ distance: 5200, duration: 610, geometry: "local-known" }],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const route = await calculatePublicRoute(
      "-15.7545,-48.2816",
      "UPA Mansões Odisseia"
    );

    expect(route.destination).toEqual({ lat: -15.77665, lng: -48.27935 });
    expect(route.source).toBe("osrm");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("router.project-osrm.org");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("nominatim");
  });

  it("does not persist typed addresses in plaintext geocode cache keys", async () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
      clear: () => saved.clear(),
      key: (index: number) => Array.from(saved.keys())[index] ?? null,
      get length() {
        return saved.size;
      },
    };
    vi.stubGlobal("localStorage", storage);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: "-15.79", lon: "-48.24" }]), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "Ok",
            routes: [{ distance: 6400, duration: 720, geometry: "private-cache" }],
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const typedAddress = "Rua Particular 123, Águas Lindas de Goiás, GO";
    await calculatePublicRoute("-15.7545,-48.2816", typedAddress);

    const keys = Array.from(saved.keys());
    expect(keys.some(key => key.startsWith("trajeto:public-routing:geocode:"))).toBe(true);
    expect(keys.join(" ").toLocaleLowerCase("pt-BR")).not.toContain(
      "rua particular 123"
    );
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

  it("coarsens manually typed coordinate origins before public routing or cache storage", async () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
      clear: () => saved.clear(),
      key: (index: number) => Array.from(saved.keys())[index] ?? null,
      get length() {
        return saved.size;
      },
    };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [{ distance: 9000, duration: 700, geometry: "coarse-origin" }],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const route = await calculatePublicRoute(
      "-15.76123, -48.28123",
      "-15.7942, -47.8822"
    );

    expect(route.origin).toEqual({ lat: -15.761, lng: -48.281 });
    const routerUrl = String(fetchMock.mock.calls[0][0]);
    expect(routerUrl).toContain("-48.281,-15.761;");
    expect(routerUrl).not.toContain("-15.76123");
    expect(routerUrl).not.toContain("-48.28123");

    const persisted = Array.from(saved.entries())
      .map(([key, value]) => key + "=" + value)
      .join("\n");
    expect(persisted).not.toContain("-15.76123");
    expect(persisted).not.toContain("-48.28123");
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

  it("calculates a prepared city route in explicit offline mode without any network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const route = await calculateOfflineRoute(
      "-15.7545,-48.2816",
      "UPA Mansões Odisseia",
      "driving"
    );

    expect(route.source).toBe("local-estimate");
    expect(route.destination).toEqual({ lat: -15.77665, lng: -48.27935 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reuses an address geocoded earlier when the device later needs an offline route", async () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
      clear: () => saved.clear(),
      key: (index: number) => Array.from(saved.keys())[index] ?? null,
      get length() {
        return saved.size;
      },
    };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);

    const firstFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: "-15.79", lon: "-48.24" }]), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "Ok",
            routes: [{ distance: 6400, duration: 720, geometry: "cached-online" }],
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", firstFetch);

    await calculatePublicRoute(
      "-15.7545,-48.2816",
      "Rua Preparada 123, Águas Lindas de Goiás, GO"
    );

    const offlineFetch = vi.fn();
    vi.stubGlobal("fetch", offlineFetch);
    const route = await calculateOfflineRoute(
      "-15.7545,-48.2816",
      "Rua Preparada 123, Águas Lindas de Goiás, GO"
    );

    expect(route.source).toBe("osrm");
    expect(route.polyline).toBe("cached-online");
    expect(route.distanceMeters).toBe(6400);
    expect(route.destination).toEqual({ lat: -15.79, lng: -48.24 });
    expect(offlineFetch).not.toHaveBeenCalled();
  });

  it("fails closed in explicit offline mode when a place is not locally prepared", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      calculateOfflineRoute(
        "-15.7545,-48.2816",
        "Destino inexistente para teste offline",
        "driving"
      )
    ).rejects.toThrow(/totalmente offline/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call the public geocoder while the device is offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
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

  it("deduplicates identical router requests while they are in flight", async () => {
    let resolveRouter: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((url: string | URL | Request) => {
      const value = String(url);
      if (value.includes("router.project-osrm.org")) {
        return new Promise<Response>(resolve => {
          resolveRouter = resolve;
        });
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const args = ["-15.7545,-48.2816", "-15.7942,-47.8822"] as const;
    const first = calculatePublicRoute(...args);
    const second = calculatePublicRoute(...args);

    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(call =>
          String(call[0]).includes("router.project-osrm.org")
        )
      ).toHaveLength(1)
    );

    resolveRouter?.(
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [{ distance: 10000, duration: 800, geometry: "shared-route" }],
        }),
        { status: 200 }
      )
    );

    const [a, b] = await Promise.all([first, second]);
    expect(a.source).toBe("osrm");
    expect(b.source).toBe("osrm");
  });

  it("uses cached/local estimates during router cooldown instead of hammering OSRM", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("router down"));
    vi.stubGlobal("fetch", fetchMock);

    const first = await calculatePublicRoute(
      "-15.7545,-48.2816",
      "-15.7942,-47.8822"
    );
    const second = await calculatePublicRoute(
      "-15.7545,-48.2816",
      "-15.80,-47.90"
    );

    expect(first.source).toBe("local-estimate");
    expect(second.source).toBe("local-estimate");
    expect(
      fetchMock.mock.calls.filter(call =>
        String(call[0]).includes("router.project-osrm.org")
      )
    ).toHaveLength(1);
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
      "CAPS"
    );

    const firstUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(firstUrl.searchParams.get("q")).toContain("CAPS");
    expect(firstUrl.searchParams.get("q")).toContain("Águas Lindas de Goiás");
  });

  it("resolves an ANP station with repeated fuel rows offline without duplicate geocoding", async () => {
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
        }].flatMap(row => [{ ...row, produto: "GASOLINA" }, { ...row, produto: "ETANOL" }]),
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
    // Simulate the cooldown window having elapsed without depending on a
    // browser storage implementation in this Node-based unit test.
    resetPublicRoutingTestState();
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

  it.each(["walking", "cycling"] as const)("does not relabel the OSRM car graph as %s", async mode => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const route = await calculatePublicRoute("-15.7,-48.2", "-15.8,-48.3", mode);
    expect(route).toMatchObject({ source: "local-estimate", mode });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps transit estimates local instead of presenting a car route as public transport", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "Ok", routes: [{ distance: 5000, duration: 300, geometry: "car-route" }] })));
    vi.stubGlobal("fetch", fetchMock);
    const route = await calculatePublicRoute("-15.7,-48.2", "-15.8,-48.3", "transit");
    expect(route.source).toBe("local-estimate");
    expect(route.mode).toBe("transit");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(buildPublicRoutePayload(route).traffic.detail).toMatch(/horários|linhas/);
  });

  it("labels Mapbox driving routes as traffic-aware optional enrichment", () => {
    const payload = buildPublicRoutePayload({
      origin: { lat: -15.754, lng: -48.262 },
      destination: { lat: -15.736, lng: -48.27 },
      distanceMeters: 3769,
      durationSeconds: 413,
      polyline: "mapbox-route",
      source: "mapbox",
      mode: "driving",
    });
    expect(payload.route.source).toBe("mapbox");
    expect(payload.route.summary).toMatch(/Mapbox/i);
    expect(payload.traffic.label).toMatch(/trânsito Mapbox/i);
    expect(payload.traffic.detail).toMatch(/driving-traffic/i);
  });

  it("expands a known station name to its catalog address before public geocoding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: "-15.75", lon: "-48.29" }]), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          code: "Ok",
          routes: [{ distance: 3100, duration: 360, geometry: "station-route" }],
        }), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);

    const route = await calculatePublicRoute(
      "-15.7545,-48.2816",
      "ZM Combustíveis, Recreio das Águas Lindas, Águas Lindas de Goiás, GO"
    );

    expect(route.destination).toEqual({ lat: -15.75, lng: -48.29 });
    const geocoderUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(geocoderUrl.searchParams.get("q")).toMatch(/Recreio das Águas Lindas/i);
    expect(geocoderUrl.searchParams.get("q")).toMatch(/Águas Lindas de Goiás/i);
  });

});
