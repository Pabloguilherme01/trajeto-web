// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useOnlineStatus } from "./useOnlineStatus";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shares one network event subscription across the main screens", () => {
  let connected = true;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => connected);
  const add = vi.spyOn(window, "addEventListener");
  const remove = vi.spyOn(window, "removeEventListener");

  const first = renderHook(() => useOnlineStatus());
  const second = renderHook(() => useOnlineStatus());

  expect(first.result.current).toBe(true);
  expect(second.result.current).toBe(true);
  expect(add.mock.calls.filter(([type]) => type === "online")).toHaveLength(1);
  expect(add.mock.calls.filter(([type]) => type === "offline")).toHaveLength(1);

  connected = false;
  act(() => window.dispatchEvent(new Event("offline")));
  expect(first.result.current).toBe(false);
  expect(second.result.current).toBe(false);

  first.unmount();
  connected = true;
  act(() => window.dispatchEvent(new Event("online")));
  expect(second.result.current).toBe(true);

  second.unmount();
  expect(remove.mock.calls.filter(([type]) => type === "online")).toHaveLength(1);
  expect(remove.mock.calls.filter(([type]) => type === "offline")).toHaveLength(1);
});

it("reads offline state on the first render without waiting for an event", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const view = renderHook(() => useOnlineStatus());
  expect(view.result.current).toBe(false);
  view.unmount();
});
