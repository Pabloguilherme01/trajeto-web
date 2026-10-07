import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TileStationMap from "./TileStationMap";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("offers the official Organic Maps install link beside navigation", () => {
  render(
    <TileStationMap
      stations={[
        { id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
      ]}
      travelMode="walking"
    />
  );
  const install = screen.getByRole("link", { name: /Instalar ou atualizar Organic Maps/i });
  expect(install.getAttribute("href")).toBe("https://get.omaps.org/");
  const organic = screen.getByRole("button", { name: /Abrir Posto A no Organic Maps/i });
  expect(organic).toBeTruthy();
  expect(organic.textContent).toContain("Organic Maps");
});

it("keeps the selected marker above coincident catalogue points", () => {
  render(<TileStationMap stations={[
    { id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
    { id: "b", name: "Posto B", address: "Rua B", lat: -15.7545, lng: -48.2816 },
  ]} />);
  const first = screen.getByRole("button", { name: "Abrir Posto A" });
  const second = screen.getByRole("button", { name: "Abrir Posto B" });
  expect(Number(first.style.zIndex)).toBeGreaterThan(Number(second.style.zIndex));
  fireEvent.click(second);
  expect(Number(second.style.zIndex)).toBeGreaterThan(Number(first.style.zIndex));
});
it("keeps marker clusters stable while panning the camera", () => {
  render(<TileStationMap stations={[
    { id: "selected", name: "Selecionado", address: "Rua A", lat: -15.7545, lng: -48.2816 },
    { id: "b", name: "Ponto B", address: "Rua B", lat: -15.75455, lng: -48.28165 },
    { id: "c", name: "Ponto C", address: "Rua C", lat: -15.7546, lng: -48.2817 },
  ]} />);
  const cluster = screen.getByRole("button", { name: "Ampliar grupo de 2 lugares" });
  const before = parseFloat(cluster.style.left);
  fireEvent.keyDown(screen.getByRole("region", { name: "Mapa dos postos" }), { key: "ArrowRight" });
  const after = screen.getByRole("button", { name: "Ampliar grupo de 2 lugares" });
  expect(after).toBe(cluster);
  expect(parseFloat(after.style.left)).toBeCloseTo(before - 80);
});

it("opens the local map on demand and returns to the tiled camera", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} fallback={<p>Mapa local disponível</p>} />);
  fireEvent.keyDown(screen.getByRole("region", { name: "Mapa dos postos" }), { key: "ArrowRight" });
  const left = screen.getByRole("button", { name: "Abrir Posto A" }).style.left;
  fireEvent.click(screen.getByRole("button", { name: "Abrir mapa local offline" }));
  expect(screen.getByText("Mapa local disponível")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Voltar ao mapa de ruas" }));
  expect(screen.getByRole("button", { name: "Abrir Posto A" }).style.left).toBe(left);
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

it("keeps route endpoints in a single scrollable rail on narrow maps", () => {
  render(
    <TileStationMap
      routePoints={[
        { lat: -15.7545, lng: -48.2816 },
        { lat: -15.7645, lng: -48.2916 },
      ]}
      stations={[
        { id: "origin", name: "Origem", address: "Rua A", lat: -15.7545, lng: -48.2816 },
        { id: "destination", name: "Destino", address: "Rua B", lat: -15.7645, lng: -48.2916 },
      ]}
    />
  );
  const rail = screen.getByRole("group", { name: "Pontos do percurso" });
  const origin = screen.getByRole("button", { name: "Ver origem: Origem" });
  const destination = screen.getByRole("button", { name: "Ver destino: Destino" });
  expect(rail.className).toContain("overflow-x-auto");
  expect(rail.className).toContain("snap-mandatory");
  expect(origin.className).toContain("shrink-0");
  expect(origin.className).toContain("bg-card/95");
  expect(origin.className).toContain("text-card-foreground");
  expect(origin.className).toContain("focus-visible:outline-ring");
  expect(destination.className).toContain("snap-start");
  expect(screen.getByRole("button", { name: "Aumentar zoom" }).className).toContain("bg-card/95");
});

it("contains map layout and overscroll inside the interactive viewport", () => {
  render(<TileStationMap stations={[
    { id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
  ]} />);
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  expect(map.style.contain).toBe("layout paint");
  expect(map.style.overscrollBehavior).toBe("contain");
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

it("continues one-finger drag from the flushed pinch camera without jumping", () => {
  let frame: FrameRequestCallback | null = null;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
    frame = callback;
    return 17;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

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
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  Object.assign(map, { setPointerCapture: vi.fn() });

  sendPointer(map, "pointerdown", 1, 100);
  sendPointer(map, "pointerdown", 2, 200);
  sendPointer(map, "pointermove", 2, 220);
  expect(frame).not.toBeNull();
  sendPointer(map, "pointermove", 2, 230);

  sendPointer(map, "pointerup", 2, 230);
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  const before = parseFloat(marker.style.left);

  sendPointer(map, "pointermove", 1, 120);
  expect(parseFloat(marker.style.left)).toBeCloseTo(before + 20);
  sendPointer(map, "pointerup", 1, 120);
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

it("uses composited tile movement and asynchronous tile decoding", () => {
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
  const layer = document.querySelector("[data-map-tile-layer]") as HTMLElement | null;
  const tile = document.querySelector('img[src*="tile.openstreetmap.org"]') as HTMLImageElement | null;
  expect(layer?.style.transform).toContain("translate3d");
  expect(layer?.style.willChange).toBe("transform");
  expect(tile?.getAttribute("decoding")).toBe("async");
  const tiles = [...document.querySelectorAll('img[src*="tile.openstreetmap.org"]')];
  expect(tiles.some(item => item.getAttribute("loading") === "eager")).toBe(true);
  expect(tiles.some(item => item.getAttribute("loading") === "lazy")).toBe(true);
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
  fireEvent.click(screen.getByRole("button", { name: "Escolher posto no mapa" }));
  fireEvent.click(screen.getByRole("option", { name: "Posto Distante · Rua B" }));
  expect(screen.getByText("Rua B")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Abrir Posto Distante" }).style.left).toBe("160px");
  expect(screen.getByRole("button", { name: "Abrir Posto Distante" }).getAttribute("aria-pressed")).toBe("true");
});

it("allows keyboard panning without intercepting keys in the station picker", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} />);
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  fireEvent.keyDown(screen.getByRole("region", { name: "Mapa dos postos" }), { key: "ArrowRight" });
  expect(marker.style.left).toBe("80px");
  fireEvent.keyDown(screen.getByRole("button", { name: "Escolher posto no mapa" }), { key: "ArrowRight" });
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


it("moves long route geometry by transform instead of rebuilding its points on pan", () => {
  const route = [
    { lat: -15.7545, lng: -48.2816 },
    { lat: -15.755, lng: -48.282 },
    { lat: -15.756, lng: -48.283 },
  ];
  render(
    <TileStationMap
      stations={[{ id: "a", name: "Destino", address: "Rua A", lat: -15.7545, lng: -48.2816 }]}
      routePoints={route}
    />
  );
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  const geometry = document.querySelector("[data-route-geometry]") as SVGGElement;
  const line = geometry.querySelectorAll("polyline")[1];
  const points = line.getAttribute("points");
  const transform = geometry.getAttribute("transform");
  fireEvent.keyDown(map, { key: "ArrowRight" });
  expect(line.getAttribute("points")).toBe(points);
  expect(geometry.getAttribute("transform")).not.toBe(transform);
});

it("ignores repeated failures from the same background tile", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} fallback={<p>Mapa local</p>} />);
  const tile = document.querySelector("[data-map-tile-layer] img")!;
  for (let i = 0; i < 5; i++) fireEvent.error(tile);
  expect(screen.queryByText("Mapa local")).toBeNull();
  expect(screen.getByRole("region", { name: "Mapa dos postos" })).toBeTruthy();
});

it("does not accumulate failures from previous zoom levels", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} fallback={<p>Mapa local</p>} />);
  Array.from(document.querySelectorAll("[data-map-tile-layer] img")).slice(0, 4).forEach(tile => fireEvent.error(tile));
  fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
  fireEvent.error(document.querySelector("[data-map-tile-layer] img")!);
  expect(screen.queryByText("Mapa local")).toBeNull();
  expect(screen.getByRole("region", { name: "Mapa dos postos" })).toBeTruthy();
});

it("does not abandon a large map after only five tile failures", () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1440);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(800);
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} fallback={<p>Mapa local</p>} />);
  const tiles = Array.from(document.querySelectorAll("[data-map-tile-layer] img"));
  expect(tiles.length).toBeGreaterThan(8);
  tiles.slice(0, 5).forEach(tile => fireEvent.error(tile));
  expect(screen.queryByText("Mapa local")).toBeNull();
  expect(screen.getByRole("region", { name: "Mapa dos postos" })).toBeTruthy();
});

it("returns from offline fallback when connectivity is restored", () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} fallback={<p>Mapa local</p>} />);
  const tiles = Array.from(document.querySelectorAll("[data-map-tile-layer] img"));
  expect(tiles.length).toBeGreaterThanOrEqual(5);
  tiles.forEach(tile => fireEvent.error(tile));
  expect(screen.getByText("Mapa local")).toBeTruthy();
  online.mockReturnValue(false);
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByText("Mapa local")).toBeTruthy();
  online.mockReturnValue(true);
  act(() => window.dispatchEvent(new Event("online")));
  expect(screen.queryByText("Mapa local")).toBeNull();
  expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeTruthy();
});

function sendPointer(map: HTMLElement, type: string, id: number, x: number, y = 260) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: "touch" } });
  fireEvent(map, event);
}

it("coalesces repeated pan events to the latest position in the animation frame", () => {
  let frame: FrameRequestCallback | null = null;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
    frame = callback;
    return 7;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  render(<TileStationMap stations={[
    { id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
  ]} />);
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  Object.assign(map, { setPointerCapture: vi.fn() });
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  sendPointer(map, "pointerdown", 1, 100);
  sendPointer(map, "pointermove", 1, 120);
  expect(parseFloat(marker.style.left)).toBeCloseTo(180);
  sendPointer(map, "pointermove", 1, 140);
  expect(parseFloat(marker.style.left)).toBeCloseTo(180);
  act(() => frame?.(16));
  expect(parseFloat(marker.style.left)).toBeCloseTo(200);
  sendPointer(map, "pointerup", 1, 140);
});

it("keeps following after a tap but pauses after a real drag", () => {
  const stations = [{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }];
  const view = render(<TileStationMap stations={stations} userCoords={{ lat: -15.7545, lng: -48.2816 }} />);
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  Object.assign(map, { setPointerCapture: vi.fn() });
  sendPointer(map, "pointerdown", 1, 110);
  sendPointer(map, "pointermove", 1, 112);
  sendPointer(map, "pointerup", 1, 112);
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  const before = marker.style.left;
  view.rerender(<TileStationMap stations={stations} userCoords={{ lat: -15.7545, lng: -48.2815 }} />);
  expect(marker.style.left).not.toBe(before);
  sendPointer(map, "pointerdown", 1, 110);
  sendPointer(map, "pointermove", 1, 130);
  sendPointer(map, "pointerup", 1, 130);
  const panned = marker.style.left;
  view.rerender(<TileStationMap stations={stations} userCoords={{ lat: -15.7545, lng: -48.2814 }} />);
  expect(marker.style.left).toBe(panned);
  expect(screen.getByRole("button", { name: "Recentrar mapa" }).getAttribute("aria-pressed")).toBe("false");
});

it("ignores an extra finger and recovers from capture loss", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} />);
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  Object.assign(map, { setPointerCapture: vi.fn() });
  sendPointer(map, "pointerdown", 1, 110);
  sendPointer(map, "pointerdown", 2, 210);
  sendPointer(map, "pointerdown", 3, 300);
  sendPointer(map, "pointermove", 3, 310);
  sendPointer(map, "pointerup", 3, 310);
  sendPointer(map, "pointermove", 1, 60);
  sendPointer(map, "pointermove", 2, 260);
  expect(document.querySelector('img[src*="/14/"]')).toBeTruthy();
  sendPointer(map, "lostpointercapture", 2, 260);
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  const before = parseFloat(marker.style.left);
  sendPointer(map, "pointermove", 1, 80);
  expect(parseFloat(marker.style.left)).toBeCloseTo(before + 20);
  sendPointer(map, "pointercancel", 1, 80);
  const cancelled = marker.style.left;
  sendPointer(map, "pointermove", 1, 100);
  expect(marker.style.left).toBe(cancelled);
});

it("preserves an off-center anchor during double-click zoom", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} />);
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  vi.spyOn(map, "getBoundingClientRect").mockReturnValue({ left: 40, top: 100 } as DOMRect);
  fireEvent.doubleClick(map, { clientX: 140, clientY: 300 });
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  expect(parseFloat(marker.style.left)).toBeCloseTo(220);
  expect(parseFloat(marker.style.top)).toBeCloseTo(320);
});

it("keeps an explicitly selected destination in view on GPS updates", () => {
  const stations = [
    { id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
    { id: "b", name: "Posto B", address: "Rua B", lat: -15.81, lng: -48.34 },
  ];
  const view = render(<TileStationMap stations={stations} userCoords={{ lat: -15.7545, lng: -48.2816 }} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher posto no mapa" }));
  fireEvent.click(screen.getByRole("option", { name: "Posto B · Rua B" }));
  view.rerender(<TileStationMap stations={stations} userCoords={{ lat: -15.7545, lng: -48.2815 }} />);
  expect(screen.getByRole("button", { name: "Abrir Posto B" }).style.left).toBe("160px");
});

it("scales street tiles continuously with the same pinch anchor as markers", () => {
  render(<TileStationMap stations={[{ id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 }]} />);
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  Object.assign(map, { setPointerCapture: vi.fn() });
  sendPointer(map, "pointerdown", 1, 60);
  sendPointer(map, "pointerdown", 2, 160);
  sendPointer(map, "pointermove", 2, 200);
  const marker = screen.getByRole("button", { name: "Abrir Posto A" });
  expect(parseFloat(marker.style.left)).toBeCloseTo(200);
  const tile = document.querySelector('img[src*="/13/"]')!;
  expect(parseFloat((tile.parentElement!.style.transform.match(/scale\(([^)]+)/) ?? [])[1])).toBeCloseTo(1.4);
  expect(screen.getByLabelText("Escala do mapa")).toBeTruthy();
});


it("identifica os pontos A/B e centraliza o destino sem alterar a rota", () => {
  const stations = [
    { id: "origin", name: "Origem", address: "Partida", lat: -15.7545, lng: -48.2816 },
    { id: "destination", name: "Destino", address: "Chegada", lat: -15.7555, lng: -48.2826 },
  ];
  render(<TileStationMap stations={stations} selectionLabel="Escolher ponto da viagem" routePoints={stations} />);
  const framedOrigin = screen.getByRole("button", { name: "Abrir Origem" }).style.left;
  expect(screen.getByRole("button", { name: "Abrir Origem" }).textContent).toBe("A");
  expect(screen.getByRole("button", { name: "Abrir Destino" }).textContent).toBe("B");
  fireEvent.click(screen.getByRole("button", { name: "Ver destino" }));
  expect(screen.getByRole("button", { name: "Abrir Destino" }).style.left).toBe("160px");
  expect(screen.getByRole("button", { name: "Abrir Destino" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("img", { name: "Trajeto pelas ruas" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ver origem" }));
  expect(screen.getByRole("button", { name: "Abrir Origem" }).style.left).toBe("160px");
  fireEvent.click(screen.getByRole("button", { name: "Recentrar mapa" }));
  expect(screen.getByRole("button", { name: "Abrir Origem" }).style.left).toBe(framedOrigin);
});


it("personalizes the route without resetting manual exploration and identifies walking/cycling", () => {
  const stations = [
    { id: "origin", name: "Origem", address: "Partida", lat: -15.7545, lng: -48.2816 },
    { id: "destination", name: "Destino", address: "Chegada", lat: -15.7555, lng: -48.2826 },
  ];
  const view = render(<TileStationMap stations={stations} routePoints={stations} travelMode="walking" />);
  const map = screen.getByRole("region", { name: "Mapa dos postos" });
  fireEvent.keyDown(map, { key: "ArrowRight" });
  const before = screen.getByRole("img", { name: "Trajeto pelas ruas" }).querySelectorAll("polyline")[1];
  const points = before.getAttribute("points");
  expect(before.getAttribute("stroke-dasharray")).toBe("2 9");
  expect(screen.getByText("A pé · linha pontilhada")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Cor do trajeto" }), { target: { value: "contrast" } });
  const after = screen.getByRole("img", { name: "Trajeto pelas ruas" }).querySelectorAll("polyline")[1];
  expect(after.getAttribute("stroke")).toBe("#111827");
  expect(after.getAttribute("stroke-width")).toBe("7");
  expect(after.getAttribute("points")).toBe(points);
  view.rerender(<TileStationMap stations={stations} routePoints={stations} travelMode="cycling" />);
  expect(screen.getByText("Bicicleta · linha tracejada")).toBeTruthy();
  expect(after.getAttribute("stroke-dasharray")).toBe("10 6");
});


it("uses segment images and reveals the selected place information on click", () => {
  const onSelect = vi.fn();
  render(<TileStationMap stations={[
    { id: "health", name: "Unidade de saúde", address: "Rua da Saúde", category: "saude", lat: -15.7545, lng: -48.2816 },
    { id: "shop", name: "Mercado", address: "Rua das Compras", category: "compras", lat: -15.7546, lng: -48.2817 },
  ]} onSelectStation={onSelect} />);
  expect(screen.getByRole("button", { name: "Abrir Unidade de saúde" }).querySelector('[data-map-segment="Saúde"]')).toBeTruthy();
  const shop = screen.getByRole("button", { name: "Abrir Mercado" });
  expect(shop.querySelector('[data-map-segment="Compras"]')).toBeTruthy();
  expect(shop.textContent).not.toBe("2");
  fireEvent.click(shop);
  expect(shop.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Rua das Compras")).toBeTruthy();
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "shop" }));
});
