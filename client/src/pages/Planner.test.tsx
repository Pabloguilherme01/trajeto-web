import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Planner from "./Planner";

const state = vi.hoisted(() => ({
  path: "/planejar", search: "origem=Casa&destino=Trabalho", staticRuntime: false,
  navigate: vi.fn(), mutate: vi.fn(), lookup: vi.fn(),
}));
vi.mock("wouter", () => ({ useLocation: () => [state.path, state.navigate], useSearch: () => state.search }));
vi.mock("@/lib/trpc", () => ({ trpc: { routes: { plan: { useMutation: () => ({ mutateAsync: state.mutate, isPending: false }) } } } }));
vi.mock("@/hooks/useProductEvents", () => ({ useProductEvents: () => vi.fn() }));
vi.mock("@/lib/runtimeCapabilities", () => ({ isGitHubPagesRuntime: () => state.staticRuntime, supportsLiveRouting: () => !state.staticRuntime }));
vi.mock("@/lib/mobilePreferences", () => ({ getLastTrip: () => null, rememberTrip: vi.fn() }));
vi.mock("@/lib/publicRouting", () => ({ calculatePublicRoute: vi.fn(async () => ({ origin: { lat: -15.76, lng: -48.28 }, destination: { lat: -15.79, lng: -47.88 }, distanceMeters: 12000, durationSeconds: 900, polyline: "encoded" })), buildPublicRoutePayload: vi.fn(result => ({ route: { origin: result.origin, destination: result.destination, distanceMeters: result.distanceMeters, durationSeconds: result.durationSeconds, polyline: result.polyline }, stops: [], recommendation: null, traffic: { label: "Trânsito ao vivo não disponível", detail: "teste" } })) }));
vi.mock("@/lib/mobileStationStore", () => ({ listMobileStationFavorites: () => [], toggleMobileStationFavorite: vi.fn() }));
vi.mock("@/lib/offlineStore", () => ({ listOfflineRoutes: async () => [], getOfflineRoute: state.lookup, offlineRouteId: vi.fn(), saveOfflineRoute: vi.fn(), removeOfflineRoute: vi.fn() }));
vi.mock("@/components/RouteMap", () => ({ RouteMap: () => <div data-testid="route-map">mapa</div> }));

const payload = { route: { origin: "Casa", destination: "Trabalho", distanceMeters: 12000, durationSeconds: 600 }, stops: [], recommendation: null };
const changeDestination = (value: string) => fireEvent.change(screen.getByPlaceholderText("Para onde você vai"), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Calcular rota" }));

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.path = "/planejar";
  state.search = "origem=Casa&destino=Trabalho";
  state.staticRuntime = false;
  state.mutate.mockReset().mockResolvedValue(payload);
  state.lookup.mockReset();
  state.navigate.mockReset();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Planner travel state", () => {
  it("updates the destination when a favorite changes only the query string", () => {
    const view = render(<Planner />);
    state.search = "destino=Hospital";
    view.rerender(<Planner />);
    expect((screen.getByPlaceholderText("Para onde você vai") as HTMLInputElement).value).toBe("Hospital");
    expect((screen.getByPlaceholderText("De onde você sai") as HTMLInputElement).value).toBe("");
  });

  it("opens the in-app map automatically after a successful route", async () => {
    render(<Planner />);
    submit();
    await screen.findByTestId("route-map");
    expect(screen.getByText("Mapa da rota")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ocultar mapa" })).toBeTruthy();
  });

  it("removes external navigation after editing or clearing a static route", async () => {
    state.staticRuntime = true;
    render(<Planner />);
    submit();
    await screen.findByRole("button", { name: "Navegar agora" });
    changeDestination("Hospital");
    expect(screen.queryByRole("button", { name: "Navegar agora" })).toBeNull();
    submit();
    await screen.findByRole("button", { name: "Navegar agora" });
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

  it("keeps offline saving prominent and secondary providers tucked away", async () => {
    render(<Planner />);
    submit();
    await screen.findByRole("button", { name: "Navegar agora" });
    expect(screen.getByRole("button", { name: "Salvar offline" })).toBeTruthy();
    expect(screen.getByText("Escolher navegador")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mostrar mapa" })).toBeTruthy();
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
