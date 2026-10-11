import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CityMapSurface, { type CityMapPoint } from "./CityMapSurface";

const tracked = vi.hoisted(() => ({ tiles: 0, offline: 0 }));
vi.mock("@/components/MapExplorerFrame", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/TileStationMap", () => ({
  default: ({ onPlanDestination, stations }: {
    onPlanDestination: (point: CityMapPoint) => void;
    stations: CityMapPoint[];
  }) => {
    tracked.tiles++;
    return <button onClick={() => onPlanDestination(stations[0])}>Planejar no mapa</button>;
  },
}));
vi.mock("@/components/StationMap", () => ({
  OfflineStationMap: ({ onPlanDestination, stations }: {
    onPlanDestination: (point: CityMapPoint) => void;
    stations: CityMapPoint[];
  }) => {
    tracked.offline++;
    return <button onClick={() => onPlanDestination(stations[0])}>Planejar offline</button>;
  },
}));

afterEach(() => {
  cleanup();
  tracked.tiles = 0;
  tracked.offline = 0;
});

const points: CityMapPoint[] = [{
  id: "upa", name: "UPA", address: "Águas Lindas", lat: -15.75, lng: -48.28,
}];

it("does not rerender the expensive map when results and callback identities remain unchanged", () => {
  const onPlanDestination = vi.fn();
  const { rerender } = render(
    <CityMapSurface markers={points} online resultCount={1} onPlanDestination={onPlanDestination} />
  );
  expect(tracked.tiles).toBe(1);
  expect(tracked.offline).toBe(0);
  rerender(
    <CityMapSurface markers={points} online resultCount={1} onPlanDestination={onPlanDestination} />
  );
  expect(tracked.tiles).toBe(1);
  fireEvent.click(screen.getByRole("button", { name: "Planejar no mapa" }));
  expect(onPlanDestination).toHaveBeenCalledWith(points[0]);
});

it("still reacts to online/offline changes and keeps the destination action", () => {
  const onPlanDestination = vi.fn();
  const { rerender } = render(
    <CityMapSurface markers={points} online resultCount={1} onPlanDestination={onPlanDestination} />
  );
  rerender(
    <CityMapSurface markers={points} online={false} resultCount={1} onPlanDestination={onPlanDestination} />
  );
  expect(tracked.offline).toBe(1);
  fireEvent.click(screen.getByRole("button", { name: "Planejar offline" }));
  expect(onPlanDestination).toHaveBeenCalledWith(points[0]);
  rerender(
    <CityMapSurface markers={points} online resultCount={1} onPlanDestination={onPlanDestination} />
  );
  expect(tracked.tiles).toBe(2);
});

it("preserves an accessible empty state and its offline guidance", () => {
  const { rerender } = render(
    <CityMapSurface markers={[]} online resultCount={0} onPlanDestination={() => {}} />
  );
  expect(screen.getByRole("region", { name: "Mapa da cidade" })).toBeTruthy();
  expect(screen.getByText(/Não há posições cadastradas/)).toBeTruthy();
  rerender(
    <CityMapSurface markers={[]} online={false} resultCount={0} onPlanDestination={() => {}} />
  );
  expect(screen.getByText(/O mapa de ruas precisa de conexão/)).toBeTruthy();
});
