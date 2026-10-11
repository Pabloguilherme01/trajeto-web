import { expect, it, vi } from "vitest";
import type { StationMapItem } from "@/components/StationMap";
import { restoreStationCoordinates } from "./stationCoordinateRestore";

function point(i: number): StationMapItem {
  return { id: "station-" + i, name: "Posto " + i, address: "Rua " + i, lat: -15.7, lng: -48.2 };
}

it("skips every synchronous cache read for verified positions in a large directory", () => {
  const stations = Array.from({ length: 1000 }, (_, i) => point(i));
  const readCached = vi.fn(() => ({ lat: -15.9, lng: -48.4, source: "local" as const }));
  const resolved = restoreStationCoordinates(stations, readCached);
  expect(readCached).not.toHaveBeenCalled();
  expect(resolved).toEqual(stations);
  expect(resolved.every((station, i) => station === stations[i])).toBe(true);
});

it("recovers only unresolved positions, preserving the original order and source labels", () => {
  const known = point(1);
  const unknown = { id: "missing", name: "Sem coordenadas", address: "Setor 4" };
  const invalid = { ...point(3), lat: Number.NaN };
  const noCache = { id: "not-found", name: "Sem cache", address: "Centro" };
  const stations = [known, unknown, invalid, noCache];
  const readCached = vi.fn((station: StationMapItem) => station.id === "not-found"
    ? null
    : { lat: -15.75, lng: -48.28, source: "local" as const });
  const actual = restoreStationCoordinates(stations, readCached);
  expect(readCached).toHaveBeenCalledTimes(3);
  expect(readCached.mock.calls.map(([station]) => station.id)).toEqual(["missing", "station-3", "not-found"]);
  expect(actual.map(s => s.id)).toEqual(stations.map(s => s.id));
  expect(actual[0]).toBe(known);
  expect(actual[1]).toEqual({ ...unknown, lat: -15.75, lng: -48.28, source: "local" });
  expect(actual[2]).toEqual({ ...invalid, lat: -15.75, lng: -48.28, source: "local" });
  expect(actual[3]).toBe(noCache);
});

it("keeps snapshots independent when locally cached coordinates are updated", () => {
  const first = [{ id: "new", name: "Posto", address: "Rua Principal" }];
  const readA = vi.fn(() => ({ lat: -15.7, lng: -48.2, source: "local" as const }));
  const readB = vi.fn(() => ({ lat: -15.8, lng: -48.3, source: "local" as const }));
  const a = restoreStationCoordinates(first, readA);
  const b = restoreStationCoordinates(first, readB);
  expect(a[0].lat).toBe(-15.7);
  expect(b[0].lat).toBe(-15.8);
  expect(first[0]).not.toHaveProperty("lat");
});
