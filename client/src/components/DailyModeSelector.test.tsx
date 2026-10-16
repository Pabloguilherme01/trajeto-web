// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const navigate = vi.hoisted(() => vi.fn());
vi.mock("wouter", () => ({ useLocation: () => ["/", navigate] }));

import DailyModeSelector from "./DailyModeSelector";

vi.mock("@/lib/offlineStore", () => ({
  listOfflineRoutes: vi.fn().mockResolvedValue([]),
  offlineRouteEvent: "trajeto-offline-route-change",
}));
describe("DailyModeSelector", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("keeps mode choices collapsed until the user asks to change mode", () => {
    render(<DailyModeSelector />);
    expect(screen.queryByRole("list")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Trocar modo" }));
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fechar" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("persists a manually selected mode", () => {
    render(<DailyModeSelector />);
    fireEvent.click(screen.getByRole("button", { name: "Trocar modo" }));
    fireEvent.click(screen.getByRole("button", { name: "Economia" }));
    expect(localStorage.getItem("trajeto-daily-mode")).toBe("economia");
  });
});

it("opens the automatic destination when leaving a manual mode", () => {
  localStorage.setItem("trajeto-daily-mode", "economia");
  render(<DailyModeSelector />);
  fireEvent.click(screen.getByRole("button", { name: /Automático:/ }));
  expect(navigate).toHaveBeenLastCalledWith(expect.stringMatching(/\/planejar$/));
  expect(localStorage.getItem("trajeto-daily-mode")).toBe("automatico");
});

afterEach(() => { cleanup(); localStorage.clear(); });

it("updates preferences without rereading offline routes", async () => {
  const { listOfflineRoutes } = await import("@/lib/offlineStore");
  const { mobilePreferenceEvent } = await import("@/lib/mobilePreferences");
  vi.mocked(listOfflineRoutes).mockClear();
  render(<DailyModeSelector />);
  await screen.findByRole("button", { name: "Automático: próxima viagem" });
  localStorage.setItem("trajeto-mobile-economy", "1");
  fireEvent(window, new Event(mobilePreferenceEvent));
  fireEvent(window, new Event(mobilePreferenceEvent));
  fireEvent(window, new Event(mobilePreferenceEvent));
  await screen.findByRole("button", { name: "Automático: economia" });
  expect(listOfflineRoutes).toHaveBeenCalledTimes(1);
});

it("ignores an older route read that finishes after a newer refresh", async () => {
  const { listOfflineRoutes, offlineRouteEvent } = await import("@/lib/offlineStore");
  let resolveOlder!: (routes: Awaited<ReturnType<typeof listOfflineRoutes>>) => void;
  vi.mocked(listOfflineRoutes).mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }));
  render(<DailyModeSelector />);
  fireEvent(window, new Event(offlineRouteEvent));
  await act(async () => { await Promise.resolve(); });
  await act(async () => { resolveOlder([{} as Awaited<ReturnType<typeof listOfflineRoutes>>[number]]); });
  expect(screen.getByRole("button", { name: "Automático: próxima viagem" })).toBeTruthy();
});

it("refreshes preference-dependent mode labels when the window regains focus", async () => {
  render(<DailyModeSelector />);
  await act(async () => { await Promise.resolve(); });
  localStorage.setItem("trajeto-mobile-economy", "1");
  fireEvent(window, new Event("focus"));
  await screen.findByRole("button", { name: "Automático: economia" });
});
