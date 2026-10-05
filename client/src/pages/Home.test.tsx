// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  setPrivateLocationHandoff: vi.fn(),
  clearPrivateLocationHandoff: vi.fn(),
}));

vi.mock("wouter", () => ({ useLocation: () => ["/", state.navigate] }));
vi.mock("@/lib/appUrl", () => ({ appUrl: (value: string) => value }));
vi.mock("@/lib/mobilePreferences", () => ({
  getLastTrip: () => null,
  getRecentSearches: () => [],
  getRecentTrips: () => [],
  mobilePreferenceEvent: "trajeto:mobile-preference",
  rememberIntent: vi.fn(),
  rememberSearch: vi.fn(),
}));
vi.mock("@/lib/mobileDestinations", () => ({
  getMobileDestinations: () => [],
  rememberDestinationUsage: vi.fn(),
}));
vi.mock("@/lib/localRoutePresets", () => ({ LOCAL_ROUTE_PRESETS: [] }));
vi.mock("@/lib/localPlaces", () => ({ LOCAL_PLACES: [] }));
vi.mock("@/lib/mobileTools", () => ({
  buildNearbyStationsUrl: (value: string) => value,
  shareText: vi.fn(),
  vibration: vi.fn(),
}));
vi.mock("@/hooks/useProductEvents", () => ({ useProductEvents: () => vi.fn() }));
vi.mock("@/lib/locationPrivacy", () => ({
  PRIVATE_LOCATION_LABEL: "Minha localização",
  clearPrivateLocationHandoff: state.clearPrivateLocationHandoff,
  isCurrentLocationLabel: (value: string) => value === "Minha localização",
  setPrivateLocationHandoff: state.setPrivateLocationHandoff,
}));
vi.mock("@/lib/tripLinks", () => ({ buildReusableTripPlannerUrl: () => "/planejar" }));
vi.mock("@/components/TripReadinessCard", () => ({ default: () => null }));
vi.mock("@/components/ReadyRouteShortcuts", () => ({ default: () => null }));
vi.mock("@/components/DailyModeSelector", () => ({ default: () => null }));
vi.mock("@/lib/localData", () => ({ localDataEvent: "trajeto:local-data" }));

beforeEach(() => {
  state.navigate.mockReset();
  state.setPrivateLocationHandoff.mockReset();
  state.clearPrivateLocationHandoff.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Home GPS origin", () => {
  it("does not let a pending GPS response overwrite a manually typed origin", () => {
    let gps!: PositionCallback;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (callback: PositionCallback) => { gps = callback; } },
    });

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Usar minha localização como origem" }));
    fireEvent.change(screen.getByPlaceholderText("De onde você sai"), { target: { value: "Origem manual" } });
    act(() => gps({ coords: { latitude: -15.76123, longitude: -48.28123 } } as GeolocationPosition));

    expect((screen.getByPlaceholderText("De onde você sai") as HTMLInputElement).value).toBe("Origem manual");
    expect(state.setPrivateLocationHandoff).not.toHaveBeenCalled();
  });

  it("blocks route submission while the GPS origin is pending", () => {
    let gps!: PositionCallback;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (callback: PositionCallback) => { gps = callback; } },
    });

    render(<Home />);
    fireEvent.change(screen.getByPlaceholderText("Para onde você vai"), { target: { value: "Hospital" } });
    fireEvent.click(screen.getByRole("button", { name: "Usar minha localização como origem" }));

    const action = screen.getByRole("button", { name: /Aguarde a localização/i }) as HTMLButtonElement;
    expect(action.disabled).toBe(true);
    expect(action.getAttribute("aria-busy")).toBe("true");
    fireEvent.submit(action.closest("form")!);
    expect(state.navigate).not.toHaveBeenCalled();

    act(() => gps({ coords: { latitude: -15.76123, longitude: -48.28123 } } as GeolocationPosition));
    expect(state.setPrivateLocationHandoff).toHaveBeenCalledWith({ lat: -15.76123, lng: -48.28123 });
    fireEvent.click(screen.getByRole("button", { name: "Ir até aqui" }));
    expect(state.navigate).toHaveBeenCalledWith("/planejar?destino=Hospital&auto=1&local=1");
  });
});
