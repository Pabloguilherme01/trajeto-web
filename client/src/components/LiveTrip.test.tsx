// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLiveTrip } from "@/hooks/useLiveTrip";
import { localDataEvent } from "@/lib/localData";
const route = { origin: { lat: -15.75, lng: -48.28 }, destination: { lat: -15.74, lng: -48.28 }, distanceMeters: 1200, durationSeconds: 600, source: "local-estimate" };
let update: PositionCallback;
let fail: PositionErrorCallback;
const clear = vi.fn();
const watch = vi.fn();
const position = (lat = -15.745, accuracy = 20) => ({ coords: { latitude: lat, longitude: -48.28, accuracy }, timestamp: Date.now() }) as GeolocationPosition;
beforeEach(() => {
  clear.mockReset(); watch.mockReset().mockImplementation((success, error) => { update = success; fail = error; return 7; });
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { watchPosition: watch, clearWatch: clear } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("keeps navigation active when the same route is recreated during a render", () => {
  const { result, rerender } = renderHook(({ value }) => useLiveTrip(value), { initialProps: { value: route } });
  act(() => result.current.start());
  act(() => update(position()));
  rerender({ value: { ...route, origin: { ...route.origin }, destination: { ...route.destination } } });
  expect(result.current.active).toBe(true);
  expect(result.current.progress?.distanceMeters).toBeCloseTo(600, 0);
  expect(clear).not.toHaveBeenCalled();
});
it("requests GPS only after starting, updates locally and clears it when stopped", () => {
  const { result } = renderHook(() => useLiveTrip(route));
  expect(watch).not.toHaveBeenCalled();
  act(() => result.current.start());
  act(() => update(position()));
  expect(result.current.point?.lat).toBe(-15.745);
  expect(result.current.progress?.distanceMeters).toBeCloseTo(600, 0);
  act(() => result.current.stop());
  expect(clear).toHaveBeenCalledWith(7);
  expect(result.current.point).toBeNull();
  act(() => update(position()));
  expect(result.current.point).toBeNull();
});
it("ignores inaccurate fixes and pauses estimates when the accepted fix goes stale", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useLiveTrip(route));
  act(() => result.current.start());
  act(() => update(position(-15.745, 500)));
  expect(result.current.point).toBeNull();
  act(() => update(position()));
  act(() => vi.advanceTimersByTime(25000));
  expect(result.current.point).toBeNull();
  expect(result.current.progress).toBeNull();
  expect(result.current.message).toContain("antigo");
});
it("stops on data deletion and ignores late GPS updates", () => {
  const { result } = renderHook(() => useLiveTrip(route));
  act(() => result.current.start());
  act(() => update(position()));
  act(() => window.dispatchEvent(new Event(localDataEvent)));
  expect(result.current.active).toBe(false);
  act(() => update(position()));
  expect(result.current.point).toBeNull();
});
it("stops on route replacement, unmount and permission denial", () => {
  const { result, rerender, unmount } = renderHook(({ value }) => useLiveTrip(value), { initialProps: { value: route } });
  act(() => result.current.start());
  rerender({ value: { ...route, distanceMeters: 900 } });
  expect(result.current.active).toBe(false);
  act(() => result.current.start());
  act(() => fail({ code: 1 } as GeolocationPositionError));
  expect(result.current.message).toContain("não autorizada");
  expect(result.current.active).toBe(false);
  act(() => result.current.start());
  unmount();
  expect(clear).toHaveBeenCalledWith(7);
});

it("pauses and discards GPS when the page is hidden", () => {
  const { result } = renderHook(() => useLiveTrip(route));
  act(() => result.current.start());
  act(() => update(position()));
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(result.current.active).toBe(false);
  expect(result.current.point).toBeNull();
  expect(clear).toHaveBeenCalledWith(7);
  hidden.mockRestore();
});

it("uses stable precise GPS speed for arrival estimates and rejects out-of-order fixes", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useLiveTrip(route));
  act(() => result.current.start());
  for (let i = 0; i < 3; i++) {
    act(() => vi.advanceTimersByTime(1000));
    act(() => update({ ...position(), coords: { ...position().coords, speed: 3 } } as GeolocationPosition));
  }
  expect(result.current.speed).toBe(3);
  expect(result.current.progress?.durationSeconds).toBeCloseTo(200, 0);
  const timestamp = result.current.point!.timestamp;
  act(() => update({ ...position(-15.749), timestamp: timestamp - 1000 }));
  expect(result.current.point?.timestamp).toBe(timestamp);
  act(() => vi.advanceTimersByTime(1000));
  act(() => update({ ...position(), coords: { ...position().coords, speed: 0 } } as GeolocationPosition));
  expect(result.current.speed).toBeNull();
  expect(result.current.progress?.durationSeconds).toBeCloseTo(300, 0);
  act(() => result.current.stop());
  expect(result.current.speed).toBeNull();
});

it("rejects invalid GPS timestamps and recovers on the next valid fix", () => {
  const { result } = renderHook(() => useLiveTrip(route));
  act(() => result.current.start());
  for (const timestamp of [NaN, Infinity, -Infinity]) {
    act(() => update({ ...position(), timestamp }));
    expect(result.current.point).toBeNull();
    expect(result.current.progress).toBeNull();
  }
  act(() => update(position()));
  expect(result.current.point?.lat).toBe(-15.745);
});
