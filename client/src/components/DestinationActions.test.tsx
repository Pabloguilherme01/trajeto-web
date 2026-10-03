// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DestinationActions } from "./DestinationActions";
import { setPreferredNavigationProvider } from "@/lib/mobileTools";
import { toggleGenericDestinationFavorite } from "@/lib/unifiedDestinationStore";

const destination = {
  id: "place:prefeitura",
  kind: "place" as const,
  name: "Prefeitura",
  address: "Prefeitura de Águas Lindas de Goiás, GO",
  coordinates: { lat: -15.761, lng: -48.281 },
};

describe("DestinationActions", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("opens the preferred navigation provider instead of forcing Google Maps", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    setPreferredNavigationProvider("waze");
    render(<DestinationActions destination={destination} />);
    fireEvent.click(screen.getByRole("button", { name: /abrir no mapa/i }));
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("waze.com/ul"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("synchronizes the saved state when another surface changes the same destination", async () => {
    render(<DestinationActions destination={destination} />);
    expect(screen.getByRole("button", { name: /salvar offline/i }).getAttribute("aria-pressed")).toBe("false");
    toggleGenericDestinationFavorite(destination);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /salvo offline/i }).getAttribute("aria-pressed")).toBe("true");
    });
  });
});
