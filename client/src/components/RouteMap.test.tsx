import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OfflineRoutePreview, RouteMap, TileRouteMap } from "./RouteMap";

Object.defineProperty(window, "google", {
  value: {
    maps: {
      TrafficLayer: vi.fn(() => ({ setMap: vi.fn() })),
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

describe("RouteMap", () => {
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
  it("renders a street-tile route map with in-app geometry and controls", () => {
    render(
      <div style={{ width: 360, height: 520 }}>
        <TileRouteMap
          origin={{ lat: -15.7545, lng: -48.2816 }}
          destination={{ lat: -15.781, lng: -48.31 }}
          stops={[
            {
              placeId: "stop-1",
              name: "Parada local",
              address: "Águas Lindas de Goiás",
              lat: -15.765,
              lng: -48.295,
            },
          ]}
          routes={[
            {
              id: "principal",
              selected: true,
              polyline: "j~}~B~_lhHfEfE",
              distanceMeters: 4200,
              durationSeconds: 720,
            },
          ]}
          fallback={<div>fallback local</div>}
        />
      </div>
    );
    expect(
      screen.getByRole("region", { name: "Mapa de ruas da rota" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Diminuir zoom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rota" })).toBeTruthy();
    expect(screen.getByText(/Rota no próprio Trajeto/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /OpenStreetMap/i })).toBeTruthy();
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
