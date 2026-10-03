import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineRoutePreview, RouteMap, nearbyRouteReferences } from "./RouteMap";

afterEach(cleanup);

Object.defineProperty(window, "google", {
  value: {
    maps: {
      TrafficLayer: vi.fn(() => ({ setMap: vi.fn() })),
      Polyline: vi.fn(() => ({ setMap: vi.fn() })),
      LatLngBounds: vi.fn(() => ({ extend: vi.fn() })),
    },
  },
  configurable: true,
});

vi.mock("@/components/Map", () => ({
  MapView: ({ onMapReady }: { onMapReady: (map: any) => void }) => {
    const map = {
      fitBounds: vi.fn(),
      setMapTypeId: vi.fn(),
      setZoom: vi.fn(),
      getZoom: vi.fn(() => 11),
      addListener: vi.fn(() => ({ remove: vi.fn() })),
    };
    React.useEffect(() => onMapReady(map), [onMapReady]);
    return <div data-testid="map-view" />;
  },
}));

describe("nearbyRouteReferences", () => {
  it("adds only verified city references near the route", () => {
    const references = nearbyRouteReferences(
      { lat: -15.7545, lng: -48.2816 },
      { lat: -15.77665, lng: -48.27935 },
      [
        { lat: -15.7545, lng: -48.2816 },
        { lat: -15.765, lng: -48.281 },
        { lat: -15.77665, lng: -48.27935 },
      ]
    );
    expect(references.length).toBeGreaterThan(0);
    expect(references.some(item => item.name.includes("UPA Mansões Odisseia"))).toBe(true);
    expect(references.every(item => item.source === "local")).toBe(true);
  });
});

describe("RouteMap", () => {
  it("keeps saved road geometry local when explicit offline mode is requested", () => {
    render(<RouteMap forceOffline origin={{ lat: -15.8, lng: -48 }} destination={{ lat: -15.9, lng: -47.9 }} stops={[]} routes={[{ id: "saved", source: "osrm", polyline: "r`d_B~~teHbwFg_mA" }]} />);
    expect(screen.getByRole("region", { name: "Mapa offline da viagem" })).toBeTruthy();
    expect(screen.queryByTestId("map-view")).toBeNull();
    expect(screen.queryByRole("link", { name: "Abrir no Google Maps" })).toBeNull();
  });
  it("does not invent endpoints or navigation before a trip is defined", () => {
    render(<OfflineRoutePreview stops={[]} />);
    expect(screen.getByText("Defina a origem e o destino")).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: "Abrir no Google Maps" })
    ).toBeNull();
  });
  it("preserves stops in external navigation and distinguishes points from a calculated path", () => {
    render(
      <OfflineRoutePreview
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[
          {
            placeId: "stop",
            name: "Parada confirmada",
            address: "Rua A",
            lat: -15.85,
            lng: -47.95,
          },
        ]}
      />
    );
    expect(screen.getByText(/Somente os pontos informados/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Abrir no Google Maps" })
        .getAttribute("href")
    ).toContain("waypoints=-15.85%2C-47.95");
    expect(screen.getByText(/Paradas: 1. Parada confirmada/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar zoom da prévia" })
    );
    expect(
      screen
        .getByRole("button", { name: "Diminuir zoom da prévia" })
        .hasAttribute("disabled")
    ).toBe(false);
    fireEvent.click(
      screen.getByRole("button", { name: "Enquadrar" })
    );
    expect(
      screen
        .getByRole("button", { name: "Diminuir zoom da prévia" })
        .hasAttribute("disabled")
    ).toBe(true);
  });
  it("keeps the selected travel mode in external navigation", () => {
    render(
      <OfflineRoutePreview
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[]}
        travelMode="cycling"
      />
    );
    const href = screen.getByRole("link", { name: "Abrir no Google Maps" }).getAttribute("href") || "";
    expect(href).toContain("travelmode=bicycling");
    expect(href).not.toContain("travelmode=driving");
  });

  it("omits a private device origin from external map navigation", () => {
    render(
      <RouteMap
        origin={{ lat: -15.761, lng: -48.281 }}
        destination={{ lat: -15.8, lng: -48.2 }}
        stops={[]}
        privateOrigin
      />
    );
    const region = screen.getByRole("region", { name: "Prévia privada da viagem" });
    expect(region).toBeTruthy();
    const href = within(region)
      .getByRole("link", { name: "Abrir no Google Maps" })
      .getAttribute("href") || "";
    expect(href).not.toContain("origin=");
    expect(href).toContain("destination=");
  });

  it("shows street-by-street instructions when the route provider supplies steps", () => {
    render(
      <OfflineRoutePreview
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[]}
        routes={[{
          id: "road",
          source: "osrm",
          polyline: "r`d_B~~teHbwFg_mA",
          steps: [
            { instruction: "Saia em Avenida JK", name: "Avenida JK", distanceMeters: 120, durationSeconds: 30 },
            { instruction: "Vire à direita em BR-070", name: "BR-070", distanceMeters: 900, durationSeconds: 100 },
          ],
        }]}
      />
    );
    expect(screen.getByText(/Instruções pelas ruas · 2 passos/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Instruções pelas ruas · 2 passos/));
    expect(screen.getByText("Saia em Avenida JK")).toBeTruthy();
    expect(screen.getByText("Vire à direita em BR-070")).toBeTruthy();
  });

  it("oferece mapa grande, enquadramento, trânsito, satélite e zoom", () => {
    render(
      <RouteMap
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[]}
      />
    );
    expect(
      screen.getByRole("region", { name: "Mapa interativo da viagem" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Enquadrar viagem" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Trânsito" }));
    expect(
      screen
        .getByRole("button", { name: "Trânsito" })
        .getAttribute("aria-pressed")
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Satélite" }));
    expect(
      screen
        .getByRole("button", { name: "Satélite" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });
});


it("focuses endpoints and pauses GPS following when the map is explored", () => {
  render(<OfflineRoutePreview origin={{ lat: -15.75, lng: -48.29 }} destination={{ lat: -15.76, lng: -48.27 }} livePosition={{ lat: -15.755, lng: -48.28 }} stops={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Ver destino" }));
  expect(parseFloat(screen.getByRole("button", { name: "Selecionar Destino" }).style.left)).toBeCloseTo(160);
  const follow = screen.getByRole("button", { name: "Seguir GPS" });
  fireEvent.click(follow);
  expect(follow.getAttribute("aria-pressed")).toBe("true");
  expect(parseFloat(screen.getByRole("button", { name: "Selecionar Você agora" }).style.left)).toBeCloseTo(160);
  fireEvent.keyDown(screen.getByRole("region", { name: "Explorar mapa offline" }), { key: "ArrowRight" });
  expect(follow.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(follow);
  fireEvent.click(screen.getByRole("button", { name: "Enquadrar" }));
  expect(follow.getAttribute("aria-pressed")).toBe("false");
});
