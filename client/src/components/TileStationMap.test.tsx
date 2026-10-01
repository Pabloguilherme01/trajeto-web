import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TileStationMap from "./TileStationMap";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
  expect(screen.getByText("Posto B")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ver todos" }));
  expect(screen.getByRole("button", { name: "Abrir Posto B" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "2D" })).toBeNull();
});
