/** @vitest-environment jsdom */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/runtimeCapabilities", () => ({
  isGitHubPagesRuntime: () => true,
}));

vi.mock("@/components/TileStationMap", () => ({
  default: () => <div data-testid="external-tile-map">tiles</div>,
}));

import { StationMap } from "./StationMap";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("does not render external tiles when device location is present on GitHub Pages", () => {
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
      userCoords={{ lat: -15.76123, lng: -48.28123 }}
    />
  );

  expect(screen.queryByTestId("external-tile-map")).toBeNull();
  expect(screen.getByText("Disponível sem conexão")).toBeTruthy();
  expect(screen.getByText("Sua posição local")).toBeTruthy();
});
