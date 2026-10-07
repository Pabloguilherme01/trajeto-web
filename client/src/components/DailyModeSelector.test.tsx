// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
