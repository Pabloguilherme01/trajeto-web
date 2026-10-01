import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StationMap } from "./StationMap";

vi.mock("@/lib/runtimeCapabilities", () => ({ isGitHubPagesRuntime: () => true }));
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("keeps stations without ids selectable when background tiles fail", () => {
  render(<StationMap stations={[
    { placeId: "saved-a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
    { placeId: "saved-b", name: "Posto B", address: "Rua B", lat: -15.76, lng: -48.29 },
  ]} />);
  const tiles = screen.getAllByRole("presentation");
  tiles.slice(0, 5).forEach(tile => fireEvent.error(tile));
  expect(screen.getByRole("img", { name: /Mapa offline esquemático/ })).toBeTruthy();
  const picker = screen.getByRole("combobox", { name: "Escolher posto no mapa offline" });
  const option = screen.getByRole("option", { name: "Posto B" }) as HTMLOptionElement;
  fireEvent.change(picker, { target: { value: option.value } });
  expect(screen.getByText("Rua B")).toBeTruthy();
  expect(screen.queryByText("Rua A")).toBeNull();
});
