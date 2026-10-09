import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StationMap, OfflineStationMap } from "./StationMap";

vi.mock("@/lib/runtimeCapabilities", () => ({ isGitHubPagesRuntime: () => true }));
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("keeps stations without ids selectable when background tiles fail", () => {
  render(<StationMap stations={[
    { placeId: "saved-a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
    { placeId: "saved-b", name: "Posto B", address: "Rua B", lat: -15.76, lng: -48.29 },
  ]} />);
  const tiles = Array.from(document.querySelectorAll("[data-map-tile-layer] img"));
  expect(tiles.length).toBeGreaterThanOrEqual(5);
  tiles.forEach(tile => fireEvent.error(tile));
  expect(screen.getByRole("img", { name: /Mapa offline vetorial/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Escolher posto no mapa offline" }));
  fireEvent.click(screen.getByRole("option", { name: "Posto B · Rua B" }));
  expect(screen.getByText("Rua B")).toBeTruthy();
  expect(screen.queryByText("Rua A")).toBeNull();
});

it("keeps the current filtered place outside overlapping clusters", () => {
  const view = render(<OfflineStationMap stations={[{ id: "upa", name: "UPA", address: "Rua A", lat: -15.75, lng: -48.28 }]} showDestinationPicker={false} />);
  view.rerender(<OfflineStationMap stations={[
    { id: "heal", name: "HEAL", address: "Rua B", lat: -15.76, lng: -48.29 },
    { id: "alias", name: "Hospital estadual", address: "Rua B", lat: -15.76, lng: -48.29 },
  ]} showDestinationPicker={false} />);
  expect(screen.getByRole("button", { name: "Selecionar HEAL" })).toBeTruthy();
});
