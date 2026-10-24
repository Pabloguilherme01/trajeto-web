import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MobileNavigationCenter from "./MobileNavigationCenter";

afterEach(cleanup);

describe("MobileNavigationCenter", () => {
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
  it("organiza métricas e opções para telas estreitas sem cortar valores", () => {
    render(
      <MobileNavigationCenter
        origin="Águas Lindas"
        destination="Brasília"
        distance="48 km"
        duration="55 min"
        recommendationName="Posto com nome comprido para leitura"
        fuelCost={1288.5}
        offline={false}
        onNavigate={vi.fn()}
        onShare={vi.fn()}
        onSave={vi.fn()}
        onStations={vi.fn()}
      />,
    );
    const summaryGrid = screen.getByText("Combustível").parentElement?.parentElement;
    expect(summaryGrid?.className).toContain("grid-cols-2");
    expect(summaryGrid?.className).toContain("sm:grid-cols-3");
    expect(screen.getByText("Posto com nome comprido para leitura").className).toContain("break-words");
    expect(screen.getByText(/R\$\s*1\.288,50/).className).toContain("tabular-nums");
  });

  it("informa seleção dos controles para leitor de tela e usa alvos de toque de pelo menos 44px", () => {
    render(
      <MobileNavigationCenter
        origin="Centro" destination="Brasília" distance="40 km" duration="45 min"
        offline={false} onNavigate={vi.fn()} onShare={vi.fn()} onSave={vi.fn()}
        onStations={vi.fn()} onGoogleMapsPreferred={vi.fn()} onAppleMapsPreferred={vi.fn()}
      />,
    );
    const tolls = screen.getByRole("button", { name: "Evitar pedágios" });
    fireEvent.click(tolls);
    expect(tolls.getAttribute("aria-pressed")).toBe("true");
    expect(tolls.className).toContain("min-h-11");
    const apple = screen.getByRole("button", { name: "Apple" });
    fireEvent.click(apple);
    expect(apple.getAttribute("aria-pressed")).toBe("true");
    expect(apple.className).toContain("min-h-11");
  });

  it("não permite navegação com paradas quando offline ou quando a rota não foi confirmada", () => {
    const onMultiStopNavigate = vi.fn();
    const { rerender } = render(
      <MobileNavigationCenter
        origin="Centro" destination="Brasília" distance="40 km" duration="45 min"
        offline onNavigate={vi.fn()} onShare={vi.fn()} onSave={vi.fn()}
        onStations={vi.fn()} onMultiStopNavigate={onMultiStopNavigate}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Nova parada" }), { target: { value: "Posto Central" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    const multi = screen.getByRole("button", { name: /Navegar com 1 parada/i });
    expect(multi.getAttribute("disabled")).not.toBeNull();
    fireEvent.click(multi);
    expect(onMultiStopNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remover parada 1" }).className).toContain("min-w-11");

    rerender(
      <MobileNavigationCenter
        origin="Centro" destination="Brasília" distance="40 km" duration="45 min"
        offline={false} routeConfirmed={false} onNavigate={vi.fn()} onShare={vi.fn()} onSave={vi.fn()}
        onStations={vi.fn()} onMultiStopNavigate={onMultiStopNavigate}
      />,
    );
    expect(screen.getByRole("button", { name: /Navegar com 1 parada/i }).getAttribute("disabled")).not.toBeNull();
    expect(onMultiStopNavigate).not.toHaveBeenCalled();
  });

});
