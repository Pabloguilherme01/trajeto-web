import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Planner from "./Planner";
import { localDataEvent } from "@/lib/localData";
import { clearPrivateLocationHandoff, setPrivateLocationHandoff } from "@/lib/locationPrivacy";

const state = vi.hoisted(() => ({
  path: "/planejar", search: "origem=Casa&destino=Trabalho", staticRuntime: false,
  navigate: vi.fn(), mutate: vi.fn(), lookup: vi.fn(), publicRoute: vi.fn(), privateRoute: vi.fn(), offlineRoute: vi.fn(),
  saveOffline: vi.fn(), listOffline: vi.fn(),
}));
vi.mock("wouter", () => ({ useLocation: () => [state.path, state.navigate], useSearch: () => state.search }));
vi.mock("@/lib/trpc", () => ({ trpc: { routes: { plan: { useMutation: () => ({ mutateAsync: state.mutate, isPending: false }) } } } }));
vi.mock("@/hooks/useProductEvents", () => ({ useProductEvents: () => vi.fn() }));
vi.mock("@/lib/runtimeCapabilities", () => ({ isGitHubPagesRuntime: () => state.staticRuntime, supportsLiveRouting: () => !state.staticRuntime }));
vi.mock("@/lib/mobilePreferences", () => ({ getLastTrip: () => null, rememberTrip: vi.fn() }));
vi.mock("@/lib/publicRouting", () => ({ calculatePublicRoute: state.publicRoute, calculatePrivateLocationRoute: state.privateRoute, calculateOfflineRoute: state.offlineRoute, buildPublicRoutePayload: vi.fn(result => ({ route: { origin: result.origin, destination: result.destination, distanceMeters: result.distanceMeters, durationSeconds: result.durationSeconds, polyline: result.polyline, source: result.source, mode: result.mode }, stops: [], anpReferences: [], recommendation: null, traffic: { label: "Trânsito ao vivo não disponível", detail: "teste" } })) }));
vi.mock("@/lib/mobileStationStore", () => ({ listMobileStationFavorites: () => [], toggleMobileStationFavorite: vi.fn() }));
vi.mock("@/lib/offlineStore", () => ({ listOfflineRoutes: state.listOffline, getOfflineRoute: state.lookup, offlineRouteId: vi.fn(() => "route-id"), saveOfflineRoute: state.saveOffline, removeOfflineRoute: vi.fn(), isOfflineRouteStale: vi.fn(() => false), findBestOfflineRouteForTrip: (routes: any[], origin: string, destination: string, mode: string) => routes.find(route => route.origin === origin && route.destination === destination && (route.payload?.route?.mode ?? "driving") === mode) ?? null }));
vi.mock("@/components/RouteMap", () => ({ RouteMap: () => <div data-testid="route-map" /> }));

const payload = { route: { origin: "Casa", destination: "Trabalho", distanceMeters: 12000, durationSeconds: 600 }, stops: [], recommendation: null };
const changeDestination = (value: string) => fireEvent.change(screen.getByPlaceholderText("Para onde você vai"), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Calcular rota" }));

beforeEach(() => {
  vi.stubGlobal("React", React);
  clearPrivateLocationHandoff();
  state.path = "/planejar";
  state.search = "origem=Casa&destino=Trabalho";
  state.staticRuntime = false;
  state.mutate.mockReset().mockResolvedValue(payload);
  const routeResult = { origin: { lat: -15.76, lng: -48.28 }, destination: { lat: -15.79, lng: -47.88 }, distanceMeters: 12000, durationSeconds: 900, polyline: "encoded" };
  state.publicRoute.mockReset().mockResolvedValue(routeResult);
  state.privateRoute.mockReset().mockResolvedValue(routeResult);
  state.offlineRoute.mockReset().mockResolvedValue({ ...routeResult, source: "local-estimate", mode: "driving" });
  state.saveOffline.mockReset().mockResolvedValue(undefined);
  state.listOffline.mockReset().mockResolvedValue([]);
  state.lookup.mockReset();
  state.navigate.mockReset();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Planner travel state", () => {
  it("does not reopen a saved route whose read finishes after deletion", async () => {
    state.search = "rota=old-route";
    let finish!: (value: unknown) => void;
    state.lookup.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<Planner />);
    act(() => window.dispatchEvent(new Event(localDataEvent)));
    await act(async () => finish({ id: "old-route", origin: "Casa antiga", destination: "Trabalho antigo", payload }));
    expect((screen.getByPlaceholderText("De onde você sai") as HTMLInputElement).value).toBe("");
    expect(screen.queryByTestId("route-map")).toBeNull();
  });
  it("keeps a manually edited origin when an earlier GPS request finishes", () => {
    let gps!: PositionCallback;
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (callback: PositionCallback) => { gps = callback; },
    } });
    render(<Planner />);
    fireEvent.click(screen.getByRole("button", { name: "Usar localização atual" }));
    fireEvent.change(screen.getByPlaceholderText("De onde você sai"), { target: { value: "Origem manual" } });
    act(() => gps({ coords: { latitude: -15.76123, longitude: -48.28123 } } as GeolocationPosition));
    expect((screen.getByPlaceholderText("De onde você sai") as HTMLInputElement).value).toBe("Origem manual");
  });

  it("clears visible route data and rejects a GPS response received after deletion", async () => {
    let gps!: PositionCallback;
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (callback: PositionCallback) => { gps = callback; },
    } });
    render(<Planner />);
    submit();
    await screen.findByTestId("route-map");
    fireEvent.click(screen.getByRole("button", { name: "Usar localização atual" }));
    act(() => window.dispatchEvent(new Event(localDataEvent)));
    act(() => gps({ coords: { latitude: -15.76123, longitude: -48.28123 } } as GeolocationPosition));
    expect((screen.getByPlaceholderText("De onde você sai") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("Para onde você vai") as HTMLInputElement).value).toBe("");
    expect(screen.queryByTestId("route-map")).toBeNull();
    expect(screen.getByRole("button", { name: "Usar localização atual" }).hasAttribute("disabled")).toBe(false);
  });
  it("rejects a route response received after deletion", async () => {
    let resolve!: (value: typeof payload) => void;
    state.mutate.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<Planner />);
    submit();
    act(() => window.dispatchEvent(new Event(localDataEvent)));
    await act(async () => resolve(payload));
    expect(screen.queryByTestId("route-map")).toBeNull();
    expect(state.saveOffline).not.toHaveBeenCalled();
  });

  it.each([false, true])("opens the map automatically after calculation (static=%s)", async staticRuntime => {
    state.staticRuntime = staticRuntime;
    render(<Planner />);
    submit();
    expect(await screen.findByTestId("route-map")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ocultar mapa/ }));
    expect(screen.queryByTestId("route-map")).toBeNull();
    changeDestination("Hospital");
    submit();
    expect(await screen.findByTestId("route-map")).toBeTruthy();
  });

  it("updates the destination when a favorite changes only the query string", () => {
    const view = render(<Planner />);
    state.search = "destino=Hospital";
    view.rerender(<Planner />);
    expect((screen.getByPlaceholderText("Para onde você vai") as HTMLInputElement).value).toBe("Hospital");
    expect((screen.getByPlaceholderText("De onde você sai") as HTMLInputElement).value).toBe("");
  });

  it("removes external navigation after editing or clearing a static route", async () => {
    state.staticRuntime = true;
    render(<Planner />);
    submit();
    await screen.findByRole("button", { name: "Google Maps" });
    changeDestination("Hospital");
    expect(screen.queryByRole("button", { name: "Google Maps" })).toBeNull();
    submit();
    await screen.findByRole("button", { name: "Google Maps" });
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.queryByRole("button", { name: "Abrir Google Maps" })).toBeNull();
  });

  it("offers external navigation with the current position as an optional origin", async () => {
    state.staticRuntime = true;
    state.search = "destino=Hospital";
    render(<Planner />);
    submit();
    await screen.findByRole("button", { name: "Abrir Google Maps" });
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it("consumes mobile GPS handoff without putting coordinates in the query string", async () => {
    state.search = "local=1&destino=Hospital";
    setPrivateLocationHandoff({ lat: -15.76123, lng: -48.28123 });

    render(<Planner />);

    expect(
      (screen.getByPlaceholderText("De onde você sai") as HTMLInputElement).value
    ).toBe("Minha localização");
    expect(
      (screen.getByPlaceholderText("Para onde você vai") as HTMLInputElement).value
    ).toBe("Hospital");
    expect(state.search).not.toContain("-15.76123");
    expect(state.search).not.toContain("-48.28123");

    submit();
    await waitFor(() =>
      expect(state.privateRoute).toHaveBeenCalledWith(
        "-15.76123, -48.28123",
        "Hospital",
        "driving"
      )
    );
  });

  it("does not auto-save a route created from the device location", async () => {
    state.search = "local=1&destino=Hospital";
    setPrivateLocationHandoff({ lat: -15.76123, lng: -48.28123 });

    render(<Planner />);
    submit();

    await waitFor(() => expect(state.privateRoute).toHaveBeenCalled());
    expect(state.saveOffline).not.toHaveBeenCalled();
    expect(screen.getByText(/não foi salva automaticamente para proteger sua localização/i)).toBeTruthy();
  });

  it("keeps device GPS private while manual coordinate routing stays available", async () => {
    state.search = "destino=Hospital";
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({
        coords: {
          latitude: -15.76123,
          longitude: -48.28123,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition)
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(<Planner />);
    fireEvent.click(screen.getByRole("button", { name: "Usar localização atual" }));
    expect((screen.getByPlaceholderText("De onde você sai") as HTMLInputElement).value).toBe("Minha localização");

    submit();
    await waitFor(() =>
      expect(state.privateRoute).toHaveBeenCalledWith(
        "-15.76123, -48.28123",
        "Hospital",
        "driving"
      )
    );
    expect(state.mutate).not.toHaveBeenCalled();
    expect(state.publicRoute).not.toHaveBeenCalled();
  });

  it("ignores a calculation that returns after the destination changed", async () => {
    let resolve!: (value: typeof payload) => void;
    state.mutate.mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<Planner />);
    submit();
    changeDestination("Hospital");
    await act(async () => { resolve(payload); });
    expect(screen.queryByRole("button", { name: "Salvar offline" })).toBeNull();
  });

  it("discards the previous result before recalculating, including on failure", async () => {
    render(<Planner />);
    submit();
    await screen.findByRole("button", { name: "Salvar offline" });
    state.mutate.mockRejectedValueOnce(new Error("Unavailable"));
    submit();
    await screen.findByRole("button", { name: "Abrir Google Maps" });
    expect(screen.queryByRole("button", { name: "Salvar offline" })).toBeNull();
  });

  it("reuses an exact saved route automatically in offline planner mode", async () => {
    state.search = "experiencia=offline&origem=Casa&destino=Trabalho";
    state.listOffline.mockResolvedValueOnce([
      {
        id: "saved-trip",
        origin: "Casa",
        destination: "Trabalho",
        savedAt: "2026-10-02T12:00:00.000Z",
        payload: {
          ...payload,
          route: { ...payload.route, mode: "driving", source: "osrm" },
          anpReferences: [],
        },
      },
    ]);

    render(<Planner />);
    await waitFor(() => expect(state.listOffline).toHaveBeenCalled());
    submit();

    expect(await screen.findByTestId("route-map")).toBeTruthy();
    expect(state.offlineRoute).not.toHaveBeenCalled();
    expect(state.publicRoute).not.toHaveBeenCalled();
    expect(state.mutate).not.toHaveBeenCalled();
    expect(screen.getByText(/usando a melhor rota já salva/i)).toBeTruthy();
  });

  it("uses local-only routing in offline planner mode when no exact saved route exists", async () => {
    state.search = "experiencia=offline&origem=Casa&destino=Hospital";
    render(<Planner />);
    submit();

    await waitFor(() =>
      expect(state.offlineRoute).toHaveBeenCalledWith(
        "Casa",
        "Hospital",
        "driving"
      )
    );
    expect(state.publicRoute).not.toHaveBeenCalled();
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it("opens a saved route by id and reports a missing route", async () => {
    state.search = "rota=saved-1";
    state.lookup.mockResolvedValueOnce({ origin: "Origem salva", destination: "Destino salvo", payload });
    const view = render(<Planner />);
    await screen.findByRole("button", { name: "Salvar offline" });
    expect((screen.getByPlaceholderText("Para onde você vai") as HTMLInputElement).value).toBe("Destino salvo");
    state.lookup.mockResolvedValueOnce(null);
    state.search = "rota=missing";
    view.rerender(<Planner />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("não está salva"));
    expect(screen.queryByRole("button", { name: "Salvar offline" })).toBeNull();
  });
});
