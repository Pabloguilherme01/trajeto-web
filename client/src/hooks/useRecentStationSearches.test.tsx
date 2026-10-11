// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberSearch } from "@/lib/mobilePreferences";
import { useRecentStationSearches } from "./useRecentStationSearches";

describe("station recent-search subscription", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not parse history again during unrelated component renders", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem");
    const view = renderHook(() => useRecentStationSearches());
    const historyReads = () => spy.mock.calls.filter(([key]) => key === "trajeto-recent-searches").length;
    const before = historyReads();
    expect(view.result.current).toEqual([]);
    view.rerender();
    view.rerender();
    expect(historyReads()).toBe(before);
  });

  it("updates immediately on a new local search, without duplicate history", () => {
    const { result } = renderHook(() => useRecentStationSearches());
    act(() => rememberSearch("UPA"));
    expect(result.current).toEqual(["UPA"]);
    act(() => rememberSearch("Postos perto do Centro"));
    expect(result.current).toEqual(["Postos perto do Centro", "UPA"]);
    act(() => rememberSearch("UPA"));
    expect(result.current).toEqual(["UPA", "Postos perto do Centro"]);
  });

  it("refreshes a new-tab change and a focus return, preserving private sanitization", () => {
    const { result } = renderHook(() => useRecentStationSearches());
    act(() => {
      localStorage.setItem("trajeto-recent-searches", JSON.stringify(["Hospital", "Minha localização"]));
      window.dispatchEvent(new StorageEvent("storage", { key: "trajeto-recent-searches" }));
    });
    expect(result.current).toEqual(["Hospital"]);
    expect(localStorage.getItem("trajeto-recent-searches")).toBe(JSON.stringify(["Hospital"]));
    act(() => {
      localStorage.setItem("trajeto-recent-searches", JSON.stringify(["Farmácia", "Hospital"]));
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current).toEqual(["Farmácia", "Hospital"]);
    act(() => {
      localStorage.removeItem("trajeto-recent-searches");
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current).toEqual([]);
  });
});
