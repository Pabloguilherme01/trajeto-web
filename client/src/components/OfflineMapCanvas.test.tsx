import React, { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const pack = {
  schema: 1,
  retrievedAt: "2026-10-02T12:00:00Z",
  roads: [
    {
      id: 1,
      kind: "primary",
      name: "BR-070",
      points: [
        [-15.75, -48.29],
        [-15.76, -48.27],
      ],
    },
  ],
};
beforeEach(() => { vi.resetModules(); localStorage.clear(); });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function setup() {
  const { default: Canvas } = await import("./OfflineMapCanvas");
  const markers = [
    { id: "a", name: "Origem", label: "A", lat: -15.75, lng: -48.29 },
    { id: "b", name: "Destino", label: "B", lat: -15.76, lng: -48.27 },
  ];
  function Map() {
    const [zoom, setZoom] = useState(1);
    return (
      <Canvas
        markers={markers}
        routePoints={markers}
        estimated
        zoom={zoom}
        onZoom={setZoom}
      />
    );
  }
  return render(<Map />);
}
it("uses semantic tokens for offline map controls and status chrome", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(pack)))
  );
  await setup();
  await screen.findByText(/Ruas locais disponíveis/);
  const themeToggle = screen.getByRole("button", { name: "Usar mapa claro" });
  expect(themeToggle.className).toContain("bg-card/95");
  expect(themeToggle.className).toContain("text-card-foreground");
  const expand = screen.getByRole("button", { name: "Ampliar mapa" });
  expect(expand.className).toContain("bg-card/95");
  expect(expand.className).toContain("text-card-foreground");
  const status = screen.getByRole("status");
  expect(status.parentElement?.className).toContain("bg-card");
  expect(status.parentElement?.className).toContain("text-muted-foreground");
});

it("loads local streets with no coordinate or external request, and preserves dashed estimates", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(pack)));
  vi.stubGlobal("fetch", fetchMock);
  await setup();
  await screen.findByText(/Ruas locais disponíveis/);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe(
    "/data/aguas-lindas-offline-map.json"
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Mostrar nomes de todas as ruas" })
  );
  expect(
    screen
      .getByRole("button", { name: "Ocultar nomes das ruas" })
      .getAttribute("aria-pressed")
  ).toBe("true");
  expect(
    screen.getByRole("img").querySelector("path[stroke-dasharray]")
  ).toBeTruthy();
  const marker = screen.getByRole("button", { name: "Selecionar Origem" });
  const initial = marker.style.left;
  const map = screen.getByRole("region", { name: "Explorar mapa offline" });
  fireEvent.keyDown(map, { key: "ArrowRight" });
  expect(marker.style.left).not.toBe(initial);
  fireEvent.keyDown(map, { key: "Home" });
  expect(marker.style.left).toBe(initial);
  fireEvent.click(screen.getByRole("button", { name: "Usar mapa claro" }));
  expect(
    screen
      .getByRole("button", { name: "Usar mapa escuro" })
      .getAttribute("aria-pressed")
  ).toBe("false");
});
it("moves precompiled offline streets and route with one world transform on pan", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(pack)))
  );
  await setup();
  await screen.findByText(/Ruas locais disponíveis/);
  const layer = document.querySelector("[data-offline-world-layer]") as SVGGElement | null;
  const route = document.querySelector("[data-offline-route-geometry]") as SVGPathElement | null;
  expect(layer).toBeTruthy();
  expect(route).toBeTruthy();
  const road = layer?.querySelector("path:not([data-offline-route-geometry])") as SVGPathElement | null;
  const roadPath = road?.getAttribute("d");
  const routePath = route?.getAttribute("d");
  const before = layer?.getAttribute("transform");
  fireEvent.keyDown(
    screen.getByRole("region", { name: "Explorar mapa offline" }),
    { key: "ArrowRight" }
  );
  expect(road?.getAttribute("d")).toBe(roadPath);
  expect(route?.getAttribute("d")).toBe(routePath);
  expect(layer?.getAttribute("transform")).not.toBe(before);
  expect(road?.getAttribute("vector-effect")).toBe("non-scaling-stroke");
});

it("keeps markers after pack failure and retries when connectivity returns", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(new Response(JSON.stringify(pack)));
  vi.stubGlobal("fetch", fetchMock);
  await setup();
  await screen.findByText(/Ruas indisponíveis/);
  expect(
    screen.getByRole("button", { name: "Selecionar Destino" })
  ).toBeTruthy();
  act(() => window.dispatchEvent(new Event("online")));
  await screen.findByText(/Ruas locais disponíveis/);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("rejects an incompatible pack and allows a manual recovery", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ schema: 9, roads: [] }))
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(pack)))
  );
  await setup();
  fireEvent.click(
    await screen.findByRole("button", { name: "Tentar recuperar ruas" })
  );
  await waitFor(() =>
    expect(screen.getByText(/Ruas locais disponíveis/)).toBeTruthy()
  );
});

it("rejects an empty street pack rather than claiming offline readiness", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ...pack, roads: [] })))
  );
  await setup();
  await screen.findByText(/Ruas indisponíveis/);
  expect(
    screen.getByRole("button", { name: "Selecionar Origem" })
  ).toBeTruthy();
});

it("keeps the place beneath a pinch midpoint stable", async () => {
  class Pointer extends MouseEvent {
    pointerId: number;
    constructor(
      type: string,
      init: MouseEventInit & { pointerId?: number } = {}
    ) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  vi.stubGlobal("PointerEvent", Pointer);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(pack)))
  );
  await setup();
  await screen.findByText(/Ruas locais disponíveis/);
  const map = screen.getByRole("region", { name: "Explorar mapa offline" });
  const marker = screen.getByRole("button", { name: "Selecionar Origem" });
  const initial = parseFloat(marker.style.left);
  fireEvent.pointerDown(map, { pointerId: 1, clientX: 100, clientY: 100 });
  fireEvent.pointerDown(map, { pointerId: 2, clientX: 200, clientY: 100 });
  fireEvent.pointerMove(map, { pointerId: 2, clientX: 300, clientY: 100 });
  expect(parseFloat(marker.style.left)).toBeCloseTo(200 + 2 * (initial - 150));
  act(() => {
    fireEvent.pointerMove(map, { pointerId: 2, clientX: 350, clientY: 100 });
    fireEvent.pointerMove(map, { pointerId: 2, clientX: 400, clientY: 100 });
  });
  expect(parseFloat(marker.style.left)).toBeCloseTo(250 + 3 * (initial - 150));
});
it("centers an explicitly selected destination and preserves subsequent panning", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(pack)))
  );
  const { default: Canvas } = await import("./OfflineMapCanvas");
  const markers = [
    { id: "a", name: "Origem", label: "A", lat: -15.75, lng: -48.29 },
    { id: "b", name: "Destino", label: "B", lat: -15.76, lng: -48.27 },
  ];
  const view = render(<Canvas markers={markers} zoom={2} onZoom={() => {}} />);
  await screen.findByText(/Ruas locais disponíveis/);
  const focusRequest = { point: markers[1], key: 1 };
  view.rerender(
    <Canvas
      markers={markers}
      zoom={2}
      onZoom={() => {}}
      focusRequest={focusRequest}
    />
  );
  const marker = screen.getByRole("button", { name: "Selecionar Destino" });
  expect(parseFloat(marker.style.left)).toBeCloseTo(160);
  expect(parseFloat(marker.style.top)).toBeCloseTo(180);
  fireEvent.keyDown(
    screen.getByRole("region", { name: "Explorar mapa offline" }),
    { key: "ArrowRight" }
  );
  const panned = marker.style.left;
  expect(parseFloat(panned)).not.toBe(160);
  view.rerender(
    <Canvas
      markers={[...markers]}
      zoom={2}
      onZoom={() => {}}
      focusRequest={focusRequest}
    />
  );
  expect(marker.style.left).toBe(panned);
});

it("keeps manual pan and route scale stable when a live position moves", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(pack)))
  );
  const { default: Canvas } = await import("./OfflineMapCanvas");
  const anchors = [
    { id: "a", name: "Origem", label: "A", lat: -15.75, lng: -48.29 },
    { id: "b", name: "Destino", label: "B", lat: -15.76, lng: -48.27 },
  ];
  const gps = {
    id: "live-position",
    name: "Você agora",
    label: "GPS",
    lat: -15.755,
    lng: -48.28,
  };
  const view = render(
    <Canvas markers={[...anchors, gps]} zoom={2} onZoom={() => {}} />
  );
  await screen.findByText(/Ruas locais disponíveis/);
  fireEvent.keyDown(
    screen.getByRole("region", { name: "Explorar mapa offline" }),
    { key: "ArrowRight" }
  );
  const marker = screen.getByRole("button", { name: "Selecionar Origem" });
  const initial = marker.getAttribute("style");
  view.rerender(
    <Canvas
      markers={[...anchors, { ...gps, lat: -15.8, lng: -48.4 }]}
      zoom={2}
      onZoom={() => {}}
    />
  );
  expect(marker.getAttribute("style")).toBe(initial);
});

it("follows updated GPS points at the viewport center and reports manual exploration", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(pack)))
  );
  const { default: Canvas } = await import("./OfflineMapCanvas");
  const anchors = [
    { id: "a", name: "Origem", label: "A", lat: -15.75, lng: -48.29 },
    { id: "b", name: "Destino", label: "B", lat: -15.76, lng: -48.27 },
  ];
  const gps = {
    id: "live-position",
    name: "Você agora",
    label: "GPS",
    lat: -15.755,
    lng: -48.28,
  };
  const manual = vi.fn();
  const view = render(
    <Canvas
      markers={[...anchors, gps]}
      zoom={2}
      onZoom={() => {}}
      followPoint={gps}
      onManualInteraction={manual}
    />
  );
  const marker = screen.getByRole("button", { name: "Selecionar Você agora" });
  expect(parseFloat(marker.style.left)).toBeCloseTo(160);
  const next = { ...gps, lat: -15.77, lng: -48.3 };
  view.rerender(
    <Canvas
      markers={[...anchors, next]}
      zoom={3}
      onZoom={() => {}}
      followPoint={next}
      onManualInteraction={manual}
    />
  );
  expect(parseFloat(marker.style.left)).toBeCloseTo(160);
  expect(parseFloat(marker.style.top)).toBeCloseTo(180);
  fireEvent.keyDown(
    screen.getByRole("region", { name: "Explorar mapa offline" }),
    { key: "ArrowRight" }
  );
  expect(manual).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Ampliar mapa" }));
  expect(
    screen
      .getByRole("button", { name: "Reduzir mapa" })
      .getAttribute("aria-pressed")
  ).toBe("true");
  expect(
    screen.getByRole("region", { name: "Explorar mapa offline" }).className
  ).toContain("75dvh");
});

it("declutters supporting references without hiding endpoints or GPS", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(pack)))
  );
  const { default: Canvas } = await import("./OfflineMapCanvas");
  render(
    <Canvas
      markers={[
        { id: "origin", name: "Origem", label: "A", lat: -15.75, lng: -48.29 },
        {
          id: "destination",
          name: "Destino",
          label: "B",
          lat: -15.76,
          lng: -48.27,
        },
        {
          id: "live-position",
          name: "Você",
          label: "GPS",
          lat: -15.75,
          lng: -48.29,
        },
        {
          id: "reference",
          name: "Referência sobreposta",
          label: "R",
          lat: -15.75,
          lng: -48.29,
          isReference: true,
        },
        {
          id: "other",
          name: "Referência separada",
          label: "R",
          lat: -15.755,
          lng: -48.28,
          isReference: true,
        },
      ]}
      zoom={1}
      onZoom={vi.fn()}
    />
  );
  expect(
    screen.getByRole("button", { name: "Selecionar Origem" })
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Selecionar Destino" })
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Selecionar Você" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Selecionar Referência sobreposta" })
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Selecionar Referência separada" })
  ).toBeTruthy();
  await screen.findByText(/Ruas locais disponíveis/);
});

it("does not suspend live following for a tap and ignores a third contact", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(pack))));
  const { default: Canvas } = await import("./OfflineMapCanvas");
  const manual = vi.fn();
  render(<Canvas markers={[{ id: "origin", name: "Origem", label: "A", lat: -15.75, lng: -48.29 }]} zoom={2} onZoom={() => {}} onManualInteraction={manual} />);
  await screen.findByText(/Ruas locais disponíveis/);
  const map = screen.getByRole("region", { name: "Explorar mapa offline" });
  const pointer = (type: string, id: number, x: number) => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: 100 });
    Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: "touch" } });
    fireEvent(map, event);
  };
  pointer("pointerdown", 1, 100);
  pointer("pointermove", 1, 102);
  pointer("pointerup", 1, 102);
  expect(manual).not.toHaveBeenCalled();
  pointer("pointerdown", 1, 100);
  pointer("pointermove", 1, 120);
  expect(manual).toHaveBeenCalledTimes(1);
  pointer("pointerdown", 2, 200);
  const marker = screen.getByRole("button", { name: "Selecionar Origem" });
  const before = marker.style.left;
  pointer("pointerdown", 3, 300);
  pointer("pointermove", 3, 400);
  pointer("pointerup", 3, 400);
  expect(marker.style.left).toBe(before);
  pointer("lostpointercapture", 2, 200);
  pointer("pointermove", 1, 140);
  expect(parseFloat(marker.style.left)).toBeCloseTo(parseFloat(before) + 20);
});
it("fits the route without shrinking it to include distant suggested stations", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(pack))));
  const { default: Canvas } = await import("./OfflineMapCanvas");
  const markers = [
    { id: "origin", name: "Origem", label: "A", lat: -15.75, lng: -48.29 },
    { id: "destination", name: "Destino", label: "B", lat: -15.76, lng: -48.27 },
  ];
  const view = render(<Canvas markers={markers} routePoints={markers} zoom={1} onZoom={() => {}} />);
  await screen.findByText(/Ruas locais disponíveis/);
  const origin = screen.getByRole("button", { name: "Selecionar Origem" });
  const initial = [origin.style.left, origin.style.top];
  view.rerender(<Canvas markers={[...markers, { id: "stop-far", name: "Posto distante", label: "P", lat: -15.81, lng: -48.34 }]} routePoints={markers} zoom={1} onZoom={() => {}} />);
  expect([origin.style.left, origin.style.top]).toEqual(initial);
  expect(screen.getByRole("button", { name: "Selecionar Posto distante" })).toBeTruthy();
});

it("remembers the chosen map theme without saving location", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(pack))));
  const { default: Canvas } = await import("./OfflineMapCanvas");
  const props = { markers: [], zoom: 1, onZoom: () => {} };
  const view = render(<Canvas {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Usar mapa claro" }));
  expect(localStorage.getItem("trajeto-map-theme")).toBe("light");
  expect(localStorage.length).toBe(1);
  view.unmount();
  render(<Canvas {...props} />);
  expect(screen.getByRole("button", { name: "Usar mapa escuro" })).toBeTruthy();
});
