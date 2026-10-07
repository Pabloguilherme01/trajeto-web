import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MobileNavigationCenter from "./MobileNavigationCenter";

describe("MobileNavigationCenter", () => {
  afterEach(() => cleanup());

  it("offers Organic Maps when the integration callback is available", () => {
    const organic = vi.fn();
    render(
      <MobileNavigationCenter
        origin="Águas Lindas, GO"
        destination="Brasília, DF"
        distance="48 km"
        duration="55 min"
        offline={false}
        onNavigate={vi.fn()}
        onShare={vi.fn()}
        onSave={vi.fn()}
        onStations={vi.fn()}
        onGoogleMaps={vi.fn()}
        onWaze={vi.fn()}
        onAppleMaps={vi.fn()}
        onOrganicMaps={organic}
        onGoogleMapsPreferred={vi.fn()}
        onAppleMapsPreferred={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button", { name: /Organic Maps/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("puts the destination, cost, stop and navigation action in one mobile surface", () => {
    render(
      <MobileNavigationCenter
        origin="Águas Lindas, GO"
        destination="Brasília, DF"
        distance="48 km"
        duration="55 min"
        recommendationName="Posto Exemplo"
        detourKm={1.2}
        detourSource="real"
        fuelCost={28.5}
        litersNeeded={4.8}
        autonomyKm={520}
        offline={false}
        onNavigate={vi.fn()}
        onShare={vi.fn()}
        onSave={vi.fn()}
        onStations={vi.fn()}
        onGoogleMaps={vi.fn()}
        onWaze={vi.fn()}
        onAppleMaps={vi.fn()}
        onMultiStopNavigate={vi.fn()}
        onGoogleMapsPreferred={vi.fn()}
        onAppleMapsPreferred={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Pronto para ir." })).toBeTruthy();
    expect(screen.getByText("→ Brasília, DF")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Navegar agora/i })).toBeTruthy();
    expect(screen.getAllByText("Posto Exemplo")[0]).toBeTruthy();
    expect(screen.getByText(/R\$\s*28,50/)).toBeTruthy();
    expect(screen.getByText("Autonomia estimada:")).toBeTruthy();
    expect(screen.getByText("520 km")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Google Maps/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Waze/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Apple Maps/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Preferência da viagem")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Evitar pedágios" })).toBeTruthy();
  });

  it("disables external navigation while offline but keeps the route actions visible", () => {
    render(
      <MobileNavigationCenter
        origin="Trabalho"
        destination="Casa"
        distance="10 km"
        duration="15 min"
        offline
        snapshot
        onNavigate={vi.fn()}
        onShare={vi.fn()}
        onSave={vi.fn()}
        onStations={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Navegar agora/i }).getAttribute("disabled")).not.toBeNull();
    expect(screen.getByText(/A rota salva continua disponível/)).toBeTruthy();
  });
});
