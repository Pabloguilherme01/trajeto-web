import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouteMap } from "./RouteMap";

vi.mock("@/components/Map", () => ({
  MapView: ({ onMapReady }: { onMapReady: (map: any) => void }) => {
    window.google = { maps: { RenderingType: { VECTOR: "VECTOR", RASTER: "RASTER" }, TrafficLayer: vi.fn(() => ({ setMap: vi.fn() })) } } as any;
    const map = { fitBounds: vi.fn(), setMapTypeId: vi.fn(), setZoom: vi.fn(), getZoom: vi.fn(() => 11), getRenderingType: vi.fn(() => "RASTER"), addListener: vi.fn(() => ({ remove: vi.fn() })) };
    React.useEffect(() => onMapReady(map), [onMapReady]);
    return <div data-testid="map-view" />;
  },
}));

describe("RouteMap", () => {
  it("oferece mapa grande, enquadramento, trânsito, satélite e zoom", () => {
    render(<RouteMap origin={{ lat: -15.8, lng: -48 }} destination={{ lat: -15.9, lng: -47.9 }} stops={[]} />);
    expect(screen.getByRole("region", { name: "Mapa interativo da viagem" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enquadrar viagem" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Trânsito" }));
    expect(screen.getByRole("button", { name: "Trânsito" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Satélite" }));
    expect(screen.getByRole("button", { name: "Satélite" }).getAttribute("aria-pressed")).toBe("true");
  });
});