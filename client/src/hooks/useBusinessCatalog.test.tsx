// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useBusinessCatalog } from "./useBusinessCatalog";
import type { CityAtlasItem } from "@/lib/cityAtlas";
const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/businessCatalog", () => ({ loadBusinessCatalog: load }));
beforeEach(() => load.mockReset());
afterEach(cleanup);
it("finishes loading an empty catalog instead of showing an endless spinner", async () => {
  load.mockResolvedValue([]);
  const { result } = renderHook(() => useBusinessCatalog());
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe(false);
  expect(result.current.items).toEqual([]);
});
it("reports failures and recovers through retry", async () => {
  load.mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(() => useBusinessCatalog());
  await waitFor(() => expect(result.current.error).toBe(true));
  expect(result.current.loading).toBe(false);
  const items = [{ id: "example", name: "Example", category: "servicos", sourceLabel: "local" }] as CityAtlasItem[];
  load.mockResolvedValueOnce(items);
  act(() => result.current.retry());
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.items).toEqual(items));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBe(false);
});
it("ignores responses from superseded attempts", async () => {
  let resolveFirst!: (items: CityAtlasItem[]) => void;
  load.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; })).mockResolvedValueOnce([]);
  const { result } = renderHook(() => useBusinessCatalog());
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => resolveFirst([{ id: "old" } as CityAtlasItem]));
  expect(result.current.items).toEqual([]);
});
it("allows unmounting before the request finishes", async () => {
  let reject!: (reason: Error) => void;
  load.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  const { unmount } = renderHook(() => useBusinessCatalog());
  unmount();
  await act(async () => reject(new Error("late")));
});
