import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OfflineRoutePreview, RouteMap } from "./RouteMap";

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
  it("omits a private device origin from external map navigation", () => {
    render(
      <RouteMap
        origin={{ lat: -15.761, lng: -48.281 }}
        destination={{ lat: -15.8, lng: -48.2 }}
        stops={[]}
        privateOrigin
      />
    );
    expect(screen.getByRole("region", { name: "Prévia privada da viagem" })).toBeTruthy();
    const href = screen
      .getByRole("link", { name: "Abrir no Google Maps" })
      .getAttribute("href") || "";
    expect(href).not.toContain("origin=");
    expect(href).toContain("destination=");
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
