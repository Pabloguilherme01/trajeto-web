// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import DailyMobilityHub from "./DailyMobilityHub";
import { saveMobileDestination, rememberDestinationUsage } from "@/lib/mobileDestinations";
import { saveMobileVehicle } from "@/lib/mobileVehicle";
import { setMobilityBudget } from "@/lib/mobilityBudget";

describe("DailyMobilityHub", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a useful first action when no local setup exists", () => {
    render(<DailyMobilityHub />);

    expect(screen.getByRole("heading", { name: /Tudo pronto para o próximo deslocamento/i })).toBeInTheDocument();
    expect(screen.getByText("Planejar minha próxima viagem")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continuar/i })).toHaveAttribute("href", "/trajeto-web/planejar");
  });

  it("prioritizes the most-used destination and shows local vehicle and budget", () => {
    const destination = { id: "trabalho" as const, label: "Trabalho", value: "Taguatinga, DF" };
    saveMobileDestination(destination.id, destination.value);
    rememberDestinationUsage(destination);
    rememberDestinationUsage(destination);
    saveMobileVehicle({ name: "Meu carro", fuel: "gasolina", consumption: 12.5, tank: 50 });
    setMobilityBudget(800);

    render(<DailyMobilityHub />);

    expect(screen.getByText("Ir para o destino mais usado")).toBeInTheDocument();
    expect(screen.getByText(/Trabalho · Taguatinga, DF/)).toBeInTheDocument();
    expect(screen.getByText(/12,5 km\/L · tanque 50 L/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 800,00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continuar/i })).toHaveAttribute(
      "href",
      "/trajeto-web/planejar?destino=Taguatinga%2C%20DF",
    );
  });
});
