import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TileStationMap from "./TileStationMap";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("preserves manual exploration on GPS updates and resumes following on recenter", () => {
  const stations = [{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }];
  const { rerender } = render(<TileStationMap stations={stations} userCoords={{ lat: -15.7545, lng: -48.2816 }} />);
  fireEvent.keyDown(screen.getByRole("region", { name: "Mapa dos postos" }), { key: "ArrowRight" });
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  const left = marker.style.left;
  rerender(<TileStationMap stations={stations} userCoords={{ lat: -15.7545, lng: -48.2815 }} />);
  expect(marker.style.left).toBe(left);
  fireEvent.click(screen.getByRole("button", { name: "Recentrar mapa" }));
  expect(marker.style.left).not.toBe(left);
  const recentered = marker.style.left;
  rerender(<TileStationMap stations={stations} userCoords={{ lat: -15.7545, lng: -48.2814 }} />);
  expect(marker.style.left).not.toBe(recentered);
});

it("zooms around a double-clicked point without moving its marker", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} />);
  fireEvent.doubleClick(screen.getByRole("region", { name: "Mapa dos postos" }), { clientX: 160, clientY: 260 });
  expect(screen.getByRole("button", { name: "Abrir Posto A" }).style.left).toBe("160px");
  expect(document.querySelector('img[src*="/14/"]')).toBeTruthy();
});

it("zooms with two fingers and continues dragging when one is lifted", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} />);
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  Object.assign(map, { setPointerCapture: vi.fn() });
  const pointer = (type: string, id: number, x: number) => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: 260 });
    Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: "touch" } });
    fireEvent(map, event);
  };
  pointer("pointerdown", 1, 110);
  pointer("pointerdown", 2, 210);
  pointer("pointermove", 1, 60);
  pointer("pointermove", 2, 260);
  expect(document.querySelector('img[src*="/14/"]')).toBeTruthy();
  pointer("pointerup", 2, 260);
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  const before = parseFloat(marker.style.left);
  pointer("pointermove", 1, 80);
  expect(parseFloat(marker.style.left)).toBeCloseTo(before + 20);
});

it("tracks the actual viewport and keeps the selected station after catalog updates", () => {
  let resize = () => {};
  let width = 320;
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    () => width
  );
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(520);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    }
  );
  const first = {
    id: "a",
    name: "Posto A",
    address: "Rua A",
    lat: -15.7545,
    lng: -48.2816,
  };
  const second = { ...first, id: "b", name: "Posto B" };
  const { rerender } = render(<TileStationMap stations={[first]} />);
  expect(screen.getByRole("button", { name: "Abrir Posto A" }).style.left).toBe(
    "160px"
  );
  width = 720;
  act(() => resize());
  expect(screen.getByRole("button", { name: "Abrir Posto A" }).style.left).toBe(
    "360px"
  );
  rerender(<TileStationMap stations={[second]} />);
  expect(screen.getByText("Posto B", { selector: "p" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ver todos" }));
  expect(screen.getByRole("button", { name: "Abrir Posto B" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "2D" })).toBeNull();
});

it("sends only the site origin as referrer for public OSM tiles", () => {
  render(
    <TileStationMap
      stations={[
        {
          id: "a",
          name: "Posto A",
          address: "Rua A",
          lat: -15.7545,
          lng: -48.2816,
        },
      ]}
    />
  );
  const tile = document.querySelector(
    'img[src*="tile.openstreetmap.org"]'
  ) as HTMLImageElement | null;
  expect(tile).toBeTruthy();
  expect(tile?.getAttribute("referrerpolicy")).toBe("origin");
});

it("uses the selected non-driving mode and hides car-only providers", () => {
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  render(
    <TileStationMap
      travelMode="walking"
      stations={[
        { id: "a", name: "Referência A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
      ]}
    />
  );
  const google = screen.getByRole("button", { name: /Google/i });
  fireEvent.click(google);
  expect(open).toHaveBeenCalledTimes(1);
  expect(String(open.mock.calls[0][0])).toContain("travelmode=walking");
  expect(screen.queryByRole("button", { name: /Waze/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /Apple/i })).toBeNull();
});

it("keeps OSM attribution and correction links visible", () => {
  render(
    <TileStationMap
      stations={[
        {
          id: "a",
          name: "Posto A",
          address: "Rua A",
          lat: -15.7545,
          lng: -48.2816,
        },
      ]}
    />
  );
  expect(screen.getByRole("link", { name: /OpenStreetMap contributors/i })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Corrigir mapa" }).getAttribute("href")).toContain("openstreetmap.org/fixthemap");
});

it("selects and centers a distant station from the accessible list even without ids", () => {
  render(<TileStationMap stations={[
    { name: "Posto Centro", address: "Rua A", lat: -15.7545, lng: -48.2816 },
    { name: "Posto Distante", address: "Rua B", lat: -15.81, lng: -48.34 },
  ]} />);
  const list = screen.getByRole("combobox", { name: "Escolher posto no mapa" });
  const option = screen.getByRole("option", { name: "Posto Distante" }) as HTMLOptionElement;
  fireEvent.change(list, { target: { value: option.value } });
  expect(screen.getByText("Rua B")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Abrir Posto Distante" }).style.left).toBe("160px");
  expect(screen.getByRole("button", { name: "Abrir Posto Distante" }).getAttribute("aria-pressed")).toBe("true");
});

it("allows keyboard panning without intercepting keys in the station picker", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} />);
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  fireEvent.keyDown(screen.getByRole("region", { name: "Mapa dos postos" }), { key: "ArrowRight" });
  expect(marker.style.left).toBe("80px");
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Escolher posto no mapa" }), { key: "ArrowRight" });
  expect(marker.style.left).toBe("80px");
});


it("preserves a manual pan when the same route geometry is recreated", () => {
  const stations = [{ id: "a", name: "Destino", address: "Rua A", lat: -15.7545, lng: -48.2816 }];
  const route = [{ lat: -15.7545, lng: -48.2816 }, { lat: -15.76, lng: -48.29 }];
  const { rerender } = render(<TileStationMap stations={stations} routePoints={route} />);
  fireEvent.keyDown(screen.getByRole("region", { name: "Mapa dos postos" }), { key: "ArrowRight" });
  const left = screen.getByRole("button", { name: "Abrir Destino" }).style.left;
  rerender(<TileStationMap stations={stations} routePoints={route.map(point => ({ ...point }))} />);
  expect(screen.getByRole("button", { name: "Abrir Destino" }).style.left).toBe(left);
});


it("returns from offline fallback when connectivity is restored", () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} fallback={<p>Mapa local</p>} />);
  const tile = document.querySelector("img")!;
  for (let i = 0; i < 5; i++) fireEvent.error(tile);
  expect(screen.getByText("Mapa local")).toBeTruthy();
  online.mockReturnValue(false);
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByText("Mapa local")).toBeTruthy();
  online.mockReturnValue(true);
  act(() => window.dispatchEvent(new Event("online")));
  expect(screen.queryByText("Mapa local")).toBeNull();
  expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeTruthy();
});
