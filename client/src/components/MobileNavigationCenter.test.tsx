import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MobileNavigationCenter from "./MobileNavigationCenter";

describe("MobileNavigationCenter", () => {
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
    expect(screen.getAllByRole("button", { name: /Navegar agora/i })[0]).toBeTruthy();
    expect(screen.getAllByText("Posto Exemplo")[0]).toBeTruthy();
    expect(screen.getByText(/R$ 28,50/)).toBeTruthy();
    expect(screen.getByText(/Autonomia estimada: 520 km/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Google Maps/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Waze/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Apple Maps/i })).toBeTruthy();
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

    expect(screen.getAllByRole("button", { name: /Navegar agora/i })[1].getAttribute("disabled")).not.toBeNull();
    expect(screen.getByText(/A rota salva continua disponível/)).toBeTruthy();
  });
});
