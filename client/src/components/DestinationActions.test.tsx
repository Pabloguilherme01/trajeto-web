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

  it("exposes the destination actions as a named accessibility group", () => {
    render(<DestinationActions destination={destination} />);
    expect(screen.getByRole("group", { name: "Ações para Prefeitura" })).toBeTruthy();
  });

  it("keeps shared route and save actions readable with semantic colors", () => {
    render(<DestinationActions destination={destination} />);
    const from = screen.getByRole("link", { name: /Ir daqui/i });
    const save = screen.getByRole("button", { name: /Salvar destino/i });
    for (const action of [from, save]) {
      expect(action.className).toContain("border-border");
      expect(action.className).toContain("bg-muted/10");
      expect(action.className).toContain("text-foreground/");
      expect(action.className).not.toMatch(/(?:border|bg|text)-white/);
    }
  });

  it("opens the preferred navigation provider instead of forcing Google Maps", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    setPreferredNavigationProvider("waze");
    render(<DestinationActions destination={destination} />);
    fireEvent.click(screen.getByRole("button", { name: /abrir app de mapa/i }));
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("waze.com/ul"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("opens Organic Maps when it is the preferred provider", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    setPreferredNavigationProvider("organic");
    render(<DestinationActions destination={destination} />);
    fireEvent.click(screen.getByRole("button", { name: /abrir app de mapa/i }));
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("om://v2/nav?"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("falls back to Organic Maps search when the destination has no coordinates", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    setPreferredNavigationProvider("organic");
    render(<DestinationActions destination={{ ...destination, coordinates: null }} />);
    fireEvent.click(screen.getByRole("button", { name: /abrir app de mapa/i }));
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("om://search?"),
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

afterEach(() => cleanup());

it("passes public place coordinates to the planner while preserving a named origin", () => {
  render(<DestinationActions destination={destination} />);
  const to = new URL(screen.getByRole("link", { name: /Ir até aqui/i }).getAttribute("href")!, "https://trajeto.local");
  const from = new URL(screen.getByRole("link", { name: /Ir daqui/i }).getAttribute("href")!, "https://trajeto.local");
  expect(to.searchParams.get("destino")).toBe("-15.761,-48.281");
  expect(from.searchParams.get("origem")).toBe(destination.address);
});

it("falls back to the address for invalid destination coordinates", () => {
  render(<DestinationActions destination={{ ...destination, coordinates: { lat: NaN, lng: -48 } }} />);
  const to = new URL(screen.getByRole("link", { name: /Ir até aqui/i }).getAttribute("href")!, "https://trajeto.local");
  expect(to.searchParams.get("destino")).toBe(destination.address);
});

it("reports blocked storage without claiming a save and clears the warning after retry", () => {
  render(<DestinationActions destination={destination} />);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  fireEvent.click(screen.getByRole("button", { name: /salvar destino/i }));
  expect(screen.getByRole("alert").textContent).toContain("Não foi possível");
  expect(screen.getByRole("button", { name: /salvar destino/i }).getAttribute("aria-pressed")).toBe("false");
  write.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: /salvar destino/i }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: /destino salvo/i }).getAttribute("aria-pressed")).toBe("true");
});
