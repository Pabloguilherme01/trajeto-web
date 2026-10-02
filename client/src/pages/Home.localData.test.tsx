import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Home from "./Home";
import { clearLocalAppData } from "@/lib/localData";
import { consumePrivateLocationHandoff } from "@/lib/locationPrivacy";

vi.mock("@/hooks/useProductEvents", () => ({ useProductEvents: () => vi.fn() }));
vi.mock("@/components/TripReadinessCard", () => ({ default: () => null }));
vi.mock("@/components/DailyModeSelector", () => ({ default: () => null }));
vi.mock("@/lib/offlineStore", () => ({ clearOfflineRoutes: async () => 0 }));
Object.assign(globalThis, { React });

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it("removes visible history and form values immediately after device data is cleared", async () => {
  localStorage.setItem("trajeto-recent-searches", JSON.stringify(["Minha rua particular"]));
  render(<Home />);
  const origin = screen.getByPlaceholderText("De onde você sai") as HTMLInputElement;
  const destination = screen.getByPlaceholderText("Para onde você vai") as HTMLInputElement;
  fireEvent.change(origin, { target: { value: "Minha casa" } });
  fireEvent.change(destination, { target: { value: "Hospital" } });
  expect(screen.getByRole("button", { name: "Buscar novamente: Minha rua particular" })).toBeTruthy();
  await act(async () => { await clearLocalAppData(); });
  expect(screen.queryByRole("button", { name: "Buscar novamente: Minha rua particular" })).toBeNull();
  expect(origin.value).toBe("");
  expect(destination.value).toBe("");
});

it("ignores a pending GPS callback after device data is cleared", async () => {
  let success!: PositionCallback;
  vi.stubGlobal("navigator", {
    onLine: true,
    geolocation: { getCurrentPosition: (callback: PositionCallback) => { success = callback; } },
  });
  try {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Usar minha localização como origem" }));
    await act(async () => { await clearLocalAppData(); });
    act(() => success({ coords: { latitude: -15.76123, longitude: -48.28123 } } as GeolocationPosition));
    expect(consumePrivateLocationHandoff()).toBeNull();
    expect((screen.getByPlaceholderText("De onde você sai") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: "Usar minha localização como origem" }).hasAttribute("disabled")).toBe(false);
  } finally { vi.unstubAllGlobals(); }
});
