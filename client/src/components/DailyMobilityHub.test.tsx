// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DailyMobilityHub from "./DailyMobilityHub";
import { saveMobileDestination, rememberDestinationUsage } from "@/lib/mobileDestinations";
import { saveMobileVehicle } from "@/lib/mobileVehicle";
import { setMobilityBudget } from "@/lib/mobilityBudget";
import { setSavedDailyMode } from "@/lib/dailyModes";
import * as offlineStore from "@/lib/offlineStore";

describe("DailyMobilityHub", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("shows a useful first action when no local setup exists", () => {
    render(<DailyMobilityHub />);

    expect(screen.getByRole("heading", { name: /Tudo pronto para o próximo deslocamento/i })).toBeTruthy();
    expect(screen.getByText("Planejar minha próxima viagem")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Continuar/i }).getAttribute("href")).toBe("/planejar");
  });

  it("prioritizes the most-used destination and shows local vehicle and budget", () => {
    const destination = { id: "trabalho" as const, label: "Trabalho", value: "Taguatinga, DF" };
    saveMobileDestination(destination.id, destination.value);
    rememberDestinationUsage(destination);
    rememberDestinationUsage(destination);
    saveMobileVehicle({ name: "Meu carro", fuel: "gasolina", consumption: 12.5, tank: 50 });
    setMobilityBudget(800);

    render(<DailyMobilityHub />);

    expect(screen.getByText("Ir para Trabalho")).toBeTruthy();
    expect(screen.getByText(/Trabalho · Taguatinga, DF/)).toBeTruthy();
    expect(screen.getByText(/12,5 km\/L · tanque 50 L/)).toBeTruthy();
    expect(screen.getByText(/R\$ 800,00/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Continuar/i }).getAttribute("href")).toBe(
      "/planejar?destino=Taguatinga%2C%20DF",
    );
  });
  it("respects the saved economy mode instead of forcing a destination", () => {
    const destination = { id: "trabalho" as const, label: "Trabalho", value: "Taguatinga, DF" };
    saveMobileDestination(destination.id, destination.value);
    rememberDestinationUsage(destination);
    setSavedDailyMode("economia");

    render(<DailyMobilityHub />);

    expect(screen.getByText("Ver custo da viagem")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Continuar/i }).getAttribute("href")).toBe("/#calculadora");
  });

  it("respects the saved offline mode when a route is available", async () => {
    setSavedDailyMode("offline");
    vi.spyOn(offlineStore, "listOfflineRoutes").mockResolvedValue([{
      id: "route-1",
      origin: "Casa",
      destination: "Trabalho",
      savedAt: new Date().toISOString(),
      payload: {
        route: { distanceLabel: "12 km", distanceMeters: 12000, durationSeconds: 1200 },
        stops: [{ placeId: "x", name: "Posto", address: "Rua 1" }],
        anpReferences: [],
      },
    }]);

    render(<DailyMobilityHub />);

    await waitFor(() => expect(screen.getByText("Continuar rota salva")).toBeTruthy());
    expect(screen.getByRole("link", { name: /Continuar/i }).getAttribute("href")).toBe("/planejar?salvos=1");
  });

});
