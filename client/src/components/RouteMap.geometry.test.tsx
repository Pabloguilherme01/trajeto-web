import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { decodeMapPolyline } from "@/lib/mapGeometry";

const emptyCatalog: never[] = [];
const captures = vi.hoisted(() => ({ stations: [] as Array<Array<{ id: string; name: string }>>, geometries: [] as Array<Array<{ lat: number; lng: number }>> }));
vi.mock("@/components/TileStationMap", () => ({
  default: ({ stations, routePoints }: { stations: Array<{ id: string; name: string }>; routePoints?: Array<{ lat: number; lng: number }> }) => {
    captures.stations.push(stations);
    if (routePoints) captures.geometries.push(routePoints);
    return null;
  },
}));
vi.mock("@/hooks/useBusinessCatalog", () => ({
  useBusinessCatalog: () => ({ items: emptyCatalog, loading: false, error: false, retry: vi.fn() }),
}));
vi.mock("@/lib/runtimeCapabilities", () => ({ isGitHubPagesRuntime: () => true }));
vi.mock("@/components/Map", () => ({ MapView: () => null }));

import { RouteMap } from "./RouteMap";

afterEach(() => { cleanup(); captures.geometries = []; });

it("reuses only the selected route geometry in Pages across mode changes", () => {
  const alternative = {
    id: "alternative", source: "osrm" as const,
    polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
  };
  const selected = {
    id: "selected", source: "osrm" as const, selected: true,
    polyline: "r`d_B~~teHbwFg_mA",
  };
  const routes = [alternative, selected];
  const trip = {
    origin: { lat: -15.8, lng: -48 },
    destination: { lat: -15.9, lng: -47.9 },
    stops: [],
    routes,
  };
  const { rerender } = render(<RouteMap {...trip} travelMode="driving" />);
  expect(screen.getByRole("region", { name: "Mapa independente da viagem" })).toBeTruthy();
  expect(captures.geometries.at(-1)).toEqual(decodeMapPolyline(selected.polyline));
  expect(captures.geometries.at(-1)).not.toEqual(decodeMapPolyline(alternative.polyline));
  const first = captures.geometries.at(-1);
  rerender(<RouteMap {...trip} travelMode="cycling" />);
  expect(captures.geometries.at(-1)).toBe(first);
});

it("changes the displayed route geometry when the selected route changes", () => {
  const original = { id: "one", source: "osrm" as const, selected: true, polyline: "r`d_B~~teHbwFg_mA" };
  const alternative = { id: "two", source: "osrm" as const, polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" };
  const trip = { origin: { lat: -15.8, lng: -48 }, destination: { lat: -15.9, lng: -47.9 }, stops: [] };
  const view = render(<RouteMap {...trip} routes={[original, alternative]} />);
  const previous = captures.geometries.at(-1);
  view.rerender(<RouteMap {...trip} routes={[{ ...original, selected: false }, { ...alternative, selected: true }]} />);
  expect(captures.geometries.at(-1)).toEqual(decodeMapPolyline(alternative.polyline));
  expect(captures.geometries.at(-1)).not.toBe(previous);
});


it("reuses journey markers across travel mode changes and lets references be hidden", () => {
  const trip = {
    origin: { lat: -15.7545, lng: -48.2816 },
    destination: { lat: -15.77665, lng: -48.27935 },
    stops: [],
    routes: [{ id: "road", source: "osrm" as const, polyline: "r`d_B~~teHbwFg_mA" }],
  };
  const view = render(<RouteMap {...trip} travelMode="driving" />);
  const original = captures.stations.at(-1);
  expect(original!.length).toBeGreaterThan(2);
  view.rerender(<RouteMap {...trip} travelMode="walking" />);
  expect(captures.stations.at(-1)).toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Ocultar referências" }));
  expect(captures.stations.at(-1)!.map(item => item.id)).toEqual(["origin", "destination"]);
  fireEvent.click(screen.getByRole("button", { name: "Mostrar referências" }));
  expect(captures.stations.at(-1)).toBe(original);
});
