import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import TileStationMap from "./TileStationMap";

afterEach(() => {
  cleanup();
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
  expect(screen.getByText("Posto B", { selector: "p" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ver todos" }));
  expect(screen.getByRole("button", { name: "Abrir Posto B" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "2D" })).toBeNull();
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
