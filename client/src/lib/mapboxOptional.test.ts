import { afterEach, expect, it, vi } from "vitest";
import {
  hasOptionalMapboxConfigured,
  requestOptionalMapboxRoute,
} from "./mapboxOptional";

const testToken = ["pk", "ci-public-token"].join(".");

afterEach(() => {
  vi.unstubAllGlobals();
});

it("keeps Mapbox disabled when no public token is configured", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  expect(hasOptionalMapboxConfigured("")).toBe(false);
  expect(
    await requestOptionalMapboxRoute(
      { lat: -15.754, lng: -48.262 },
      { lat: -15.736, lng: -48.27 },
      "driving",
      ""
    )
  ).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("uses the traffic-aware Mapbox driving profile with privacy-safe request options", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        code: "Ok",
        routes: [{ distance: 3769, duration: 413, geometry: "mapbox-polyline" }],
      }),
      { status: 200 }
    )
  );
  vi.stubGlobal("fetch", fetchMock);

  const result = await requestOptionalMapboxRoute(
    { lat: -15.754, lng: -48.262 },
    { lat: -15.736, lng: -48.27 },
    "driving",
    testToken
  );

  expect(result).toEqual({
    distanceMeters: 3769,
    durationSeconds: 413,
    polyline: "mapbox-polyline",
  });

  const [rawUrl, options] = fetchMock.mock.calls[0];
  const url = new URL(String(rawUrl));
  expect(url.pathname).toContain("/directions/v5/mapbox/driving-traffic/");
  expect(url.searchParams.get("geometries")).toBe("polyline");
  expect(url.searchParams.get("access_token")).toBe(testToken);
  expect(options).toMatchObject({
    credentials: "omit",
    referrerPolicy: "origin",
    cache: "no-store",
  });
});

it("does not send transit to an unsupported Mapbox directions profile", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  expect(
    await requestOptionalMapboxRoute(
      { lat: -15.754, lng: -48.262 },
      { lat: -15.736, lng: -48.27 },
      "transit",
      testToken
    )
  ).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
