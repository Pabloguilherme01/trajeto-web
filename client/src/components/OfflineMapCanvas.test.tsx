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
beforeEach(() => vi.resetModules());
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
  expect(
    screen.getByRole("img").querySelector('path[stroke-dasharray="8 8"]')
  ).toBeTruthy();
  const marker = screen.getByRole("button", { name: "Selecionar Origem" });
  const initial = marker.style.left;
  const map = screen.getByRole("region", { name: "Explorar mapa offline" });
  fireEvent.keyDown(map, { key: "ArrowRight" });
  expect(marker.style.left).not.toBe(initial);
  fireEvent.keyDown(map, { key: "Home" });
  expect(marker.style.left).toBe(initial);
  fireEvent.click(screen.getByRole("button", { name: "Usar mapa escuro" }));
  expect(
    screen
      .getByRole("button", { name: "Usar mapa claro" })
      .getAttribute("aria-pressed")
  ).toBe("true");
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
