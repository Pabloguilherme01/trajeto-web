import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Planner from "./Planner";

const state = vi.hoisted(() => ({
  path: "/planejar", search: "origem=Casa&destino=Trabalho", staticRuntime: false,
  navigate: vi.fn(), mutate: vi.fn(), lookup: vi.fn(), publicRoute: vi.fn(), routes: [] as Array<{ id: string; origin: string; destination: string; savedAt: string; payload: unknown }>,
}));
vi.mock("wouter", () => ({ useLocation: () => [state.path, state.navigate], useSearch: () => state.search }));
vi.mock("@/lib/trpc", () => ({ trpc: { routes: { plan: { useMutation: () => ({ mutateAsync: state.mutate, isPending: false }) } } } }));
vi.mock("@/hooks/useProductEvents", () => ({ useProductEvents: () => vi.fn() }));
vi.mock("@/lib/runtimeCapabilities", () => ({ isGitHubPagesRuntime: () => state.staticRuntime, supportsLiveRouting: () => !state.staticRuntime }));
vi.mock("@/lib/mobilePreferences", () => ({ getLastTrip: () => null, rememberTrip: vi.fn() }));
vi.mock("@/lib/publicRouting", () => ({
  calculatePublicRoute: state.publicRoute,
  buildPublicRoutePayload: vi.fn(result => ({
    route: {
      origin: result.origin,
      destination: result.destination,
      distanceMeters: result.distanceMeters,
      durationSeconds: result.durationSeconds,
      polyline: result.polyline,
      source: result.source ?? "osrm",
      mode: result.mode ?? "driving",
    },
    stops: [],
    recommendation: null,
    traffic: { label: "Trânsito ao vivo não disponível", detail: "teste" },
  })),
}));
vi.mock("@/lib/mobileStationStore", () => ({ listMobileStationFavorites: () => [], toggleMobileStationFavorite: vi.fn() }));
vi.mock("@/lib/offlineStore", () => ({
  listOfflineRoutes: async () => state.routes,
  getOfflineRoute: state.lookup,
  findOfflineRouteByDestination: (routes: typeof state.routes, destination: string) =>
    routes.find(route => route.destination.toLocaleLowerCase("pt-BR") === destination.trim().toLocaleLowerCase("pt-BR")) ?? null,
  findOfflineRouteByTrip: (routes: typeof state.routes, origin: string, destination: string) =>
    routes.find(route =>
      route.origin.toLocaleLowerCase("pt-BR") === origin.trim().toLocaleLowerCase("pt-BR") &&
      route.destination.toLocaleLowerCase("pt-BR") === destination.trim().toLocaleLowerCase("pt-BR")
    ) ?? null,
  offlineRouteId: vi.fn(),
  saveOfflineRoute: vi.fn(),
  removeOfflineRoute: vi.fn(),
  isOfflineRouteStale: () => false,
}));
vi.mock("@/components/RouteMap", () => ({ RouteMap: () => <div data-testid="route-map">mapa</div> }));

const payload = { route: { origin: "Casa", destination: "Trabalho", distanceMeters: 12000, durationSeconds: 600 }, stops: [], recommendation: null };
const changeDestination = (value: string) => fireEvent.change(screen.getByPlaceholderText("Digite o destino"), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Calcular rota" }));

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.path = "/planejar";
  state.search = "origem=Casa&destino=Trabalho";
  state.staticRuntime = false;
  state.mutate.mockReset().mockResolvedValue(payload);
  state.publicRoute.mockReset().mockResolvedValue({
    origin: { lat: -15.76, lng: -48.28 },
    destination: { lat: -15.79, lng: -47.88 },
    distanceMeters: 12000,
    durationSeconds: 900,
    polyline: "encoded",
    source: "osrm",
    mode: "driving",
  });
  state.lookup.mockReset();
  state.navigate.mockReset();
  state.routes = [];
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Planner travel state", () => {
  it("updates the destination when a favorite changes only the query string", () => {
    const view = render(<Planner />);
    state.search = "destino=Hospital";
    view.rerender(<Planner />);
    expect((screen.getByPlaceholderText("Digite o destino") as HTMLInputElement).value).toBe("Hospital");
    expect((screen.getByPlaceholderText("Seu ponto de partida") as HTMLInputElement).value).toBe("");
  });

  it("opens the in-app map automatically after a successful route", async () => {
    render(<Planner />);
    submit();
    await screen.findByTestId("route-map");
    expect(screen.getByText("Mapa do caminho")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ocultar mapa" })).toBeTruthy();
  });

  it("removes external navigation after editing or clearing a static route", async () => {
    state.staticRuntime = true;
    render(<Planner />);
    submit();
    await screen.findByRole("button", { name: "Começar navegação" });
    changeDestination("Hospital");
    expect(screen.queryByRole("button", { name: "Começar navegação" })).toBeNull();
    submit();
    await screen.findByRole("button", { name: "Começar navegação" });
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.queryByRole("button", { name: "Abrir Google Maps" })).toBeNull();
  });

  it("automatically uses device location when calculating without an origin", async () => {
    state.staticRuntime = true;
    state.search = "destino=Hospital";
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: {
              latitude: -15.76123,
              longitude: -48.28123,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          } as GeolocationPosition),
      },
    });
    try {
      render(<Planner />);
      submit();
      await waitFor(() =>
        expect(state.publicRoute).toHaveBeenCalledWith(
          "-15.76123, -48.28123",
          "Hospital",
          "driving"
        )
      );
      expect((screen.getByPlaceholderText("Seu ponto de partida") as HTMLInputElement).value).toBe("-15.76123, -48.28123");
    } finally {
      if (descriptor) Object.defineProperty(navigator, "geolocation", descriptor);
      else Reflect.deleteProperty(navigator, "geolocation");
    }
  });

  it("offers external navigation with the current position as an optional origin", async () => {
    state.staticRuntime = true;
    state.search = "destino=Hospital";
    render(<Planner />);
    submit();
    await screen.findByRole("button", { name: "Abrir Google Maps" });
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it("keeps offline saving prominent and secondary providers tucked away", async () => {
    render(<Planner />);
    submit();
    await screen.findByRole("button", { name: "Começar navegação" });
    expect(screen.getByRole("button", { name: "Salvar offline" })).toBeTruthy();
    expect(screen.getByText("Escolher navegador")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ocultar mapa" })).toBeTruthy();
    expect(screen.getByTestId("route-map")).toBeTruthy();
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

  it("falls back to public routing when the primary router fails", async () => {
    render(<Planner />);
    state.mutate.mockRejectedValueOnce(new Error("Unavailable"));
    submit();
    await screen.findByText(/rota pública de contingência/i);
    expect(state.publicRoute).toHaveBeenCalledWith("Casa", "Trabalho", "driving");
    expect(screen.getByTestId("route-map")).toBeTruthy();
  });

  it("clears stale route results when both routers fail", async () => {
    render(<Planner />);
    submit();
    await screen.findByRole("button", { name: "Salvar offline" });
    state.mutate.mockRejectedValueOnce(new Error("Unavailable"));
    state.publicRoute.mockRejectedValueOnce(new Error("Também indisponível"));
    submit();
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Salvar offline" })).toBeNull();
  });

  it("opens a matching saved route automatically when offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    state.staticRuntime = true;
    state.routes = [{
      id: "casa::trabalho",
      origin: "Casa",
      destination: "Trabalho",
      savedAt: new Date().toISOString(),
      payload,
    }];
    render(<Planner />);
    await screen.findByText(/1 rota pronta sem internet/i);
    submit();
    await screen.findByText(/abrimos a cópia salva desta rota/i);
    expect(screen.getByTestId("route-map")).toBeTruthy();
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it("opens a saved route by id and reports a missing route", async () => {
    state.search = "rota=saved-1";
    state.lookup.mockResolvedValueOnce({ origin: "Origem salva", destination: "Destino salvo", payload });
    const view = render(<Planner />);
    await screen.findByRole("button", { name: "Salvar offline" });
    expect((screen.getByPlaceholderText("Digite o destino") as HTMLInputElement).value).toBe("Destino salvo");
    state.lookup.mockResolvedValueOnce(null);
    state.search = "rota=missing";
    view.rerender(<Planner />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("não está salva"));
    expect(screen.queryByRole("button", { name: "Salvar offline" })).toBeNull();
  });
});
