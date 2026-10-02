/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const map = {
  setCenter: vi.fn(),
  setZoom: vi.fn(),
};

vi.mock("@/lib/runtimeCapabilities", () => ({
  isGitHubPagesRuntime: () => false,
}));

vi.mock("@/components/Map", () => ({
  MapView: ({ onMapReady }: { onMapReady?: (value: typeof map) => void }) => (
    <button type="button" onClick={() => onMapReady?.(map)}>
      mock-map-ready
    </button>
  ),
}));

import { StationMap } from "./StationMap";

afterEach(() => {
  cleanup();
  map.setCenter.mockClear();
  map.setZoom.mockClear();
  vi.restoreAllMocks();
});

it("recenters away from a previous user's private map state when local data is cleared", () => {
  render(
    <StationMap
      stations={[
        {
          id: "posto-a",
          name: "Posto A",
          address: "Águas Lindas de Goiás",
          lat: -15.75,
          lng: -48.28,
          source: "ANP",
        },
      ]}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "mock-map-ready" }));
  window.dispatchEvent(new CustomEvent("trajeto-local-data-cleared"));

  expect(map.setCenter).toHaveBeenLastCalledWith({
    lat: -15.7545,
    lng: -48.2816,
  });
  expect(map.setZoom).toHaveBeenLastCalledWith(12);
});
