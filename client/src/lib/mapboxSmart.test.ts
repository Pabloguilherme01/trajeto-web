import { afterEach, expect, it, vi } from "vitest";
import {
  requestOptionalMapboxRoute,
  resetOptionalMapboxTestState,
} from "./mapboxOptional";

const publicTestKey = ["pk", "test-public"].join(".");

afterEach(() => {
  resetOptionalMapboxTestState();
  vi.unstubAllGlobals();
});

it("deduplicates an identical optional route request", async () => {
  let finish!: (value: Response) => void;
  const fetchMock = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal("fetch", fetchMock);

  const origin = { lat: -15.754, lng: -48.262 };
  const destination = { lat: -15.736, lng: -48.27 };
  const first = requestOptionalMapboxRoute(origin, destination, "driving", publicTestKey);
  const second = requestOptionalMapboxRoute(origin, destination, "driving", publicTestKey);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  finish(new Response(JSON.stringify({
    code: "Ok",
    routes: [{ distance: 3000, duration: 300, geometry: "shared" }],
  }), { status: 200 }));

  expect(await first).toEqual(await second);
});

it("pauses optional requests briefly after a provider failure", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error("provider unavailable"));
  vi.stubGlobal("fetch", fetchMock);

  await expect(requestOptionalMapboxRoute(
    { lat: -15.754, lng: -48.262 },
    { lat: -15.736, lng: -48.27 },
    "driving",
    publicTestKey
  )).rejects.toThrow();

  const second = await requestOptionalMapboxRoute(
    { lat: -15.75, lng: -48.26 },
    { lat: -15.73, lng: -48.25 },
    "driving",
    publicTestKey
  );
  expect(second).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
