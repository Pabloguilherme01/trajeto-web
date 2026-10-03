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

  it("uses the ready-route origin for Ir daqui instead of the destination", () => {
    render(<DestinationActions destination={{ ...destination, kind: "route", routeOrigin: "Centro de Águas Lindas" }} />);
    const href = screen.getByRole("link", { name: /Ir daqui/i }).getAttribute("href") || "";
    const url = new URL(href, "https://trajeto.local");
    expect(url.searchParams.get("origem")).toBe("Centro de Águas Lindas");
    expect(url.searchParams.get("origem")).not.toBe("Prefeitura");
  });

  it("synchronizes the saved state when another surface changes the same destination", async () => {
    render(<DestinationActions destination={destination} />);
    expect(screen.getByRole("button", { name: /salvar destino/i }).getAttribute("aria-pressed")).toBe("false");
    toggleGenericDestinationFavorite(destination);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /destino salvo/i }).getAttribute("aria-pressed")).toBe("true");
    });
  });
  it("keeps a company origin identifiable without putting coordinates into the origin URL", () => {
    render(<DestinationActions destination={{ ...destination, id: "business-42115689000140", source: "CSV fornecido" }} />);
    const from = new URL(screen.getByRole("link", { name: /Ir daqui/i }).getAttribute("href")!, "https://trajeto.local");
    const to = new URL(screen.getByRole("link", { name: /Ir até aqui/i }).getAttribute("href")!, "https://trajeto.local");
    expect(from.searchParams.get("origem")).toBe("42115689000140");
    expect(to.searchParams.get("destino")).toBe("-15.761,-48.281");
  });

});
