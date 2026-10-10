import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OfflineStationMap } from "./StationMap";

const captures = vi.hoisted(() => ({
  markers: [] as unknown[][],
  picker: [] as unknown[][],
}));

vi.mock("@/components/OfflineMapCanvas", () => ({
  default: ({ markers }: { markers: unknown[] }) => {
    captures.markers.push(markers);
    return <div aria-label="Offline canvas stub" />;
  }
}));
vi.mock("@/components/MapDestinationPicker", () => ({
  default: ({ items }: { items: unknown[] }) => {
    captures.picker.push(items);
    return <div aria-label="Picker stub" />;
  }
}));

afterEach(() => {
  cleanup();
  captures.markers.length = 0;
  captures.picker.length = 0;
});

it("keeps offline marker and picker arrays stable while zooming", () => {
  const stations = [
    { id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
    { id: "b", name: "Posto B", address: "Rua B", lat: -15.76, lng: -48.29 },
  ];
  const view = render(<OfflineStationMap stations={stations} />);
  const markers = captures.markers.at(-1);
  const picker = captures.picker.at(-1);
  fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
  expect(captures.markers.at(-1)).toBe(markers);
  expect(captures.picker.at(-1)).toBe(picker);
  view.rerender(<OfflineStationMap stations={stations} />);
  expect(captures.markers.at(-1)).toBe(markers);
  expect(captures.picker.at(-1)).toBe(picker);
});

it("rebuilds marker arrays for a different filtered set and skips hidden picker", () => {
  const stations = [
    { id: "a", name: "Posto A", address: "Rua A", lat: -15.7545, lng: -48.2816 },
  ];
  const view = render(<OfflineStationMap stations={stations} showDestinationPicker={false} />);
  const markers = captures.markers.at(-1);
  expect(captures.picker).toHaveLength(0);
  view.rerender(<OfflineStationMap stations={[{ ...stations[0], id: "b", name: "Posto B" }]} showDestinationPicker={false} />);
  expect(captures.markers.at(-1)).not.toBe(markers);
  expect(screen.getByText("Posto B")).toBeTruthy();
});
