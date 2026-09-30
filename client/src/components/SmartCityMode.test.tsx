import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SmartCityMode from "./SmartCityMode";

describe("modo inteligente da cidade", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("pede localização após ação e prepara rotas nos quatro navegadores", () => {
    const getCurrentPosition = vi.fn(success => success({ coords: { latitude: -15.86, longitude: -48.03 } }));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });

    render(<SmartCityMode />);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Sincronizar minha localização/ }));

    expect(screen.getByText("Ponto de partida definido")).toBeTruthy();
    fireEvent.click(screen.getByText("Hospital Municipal Bom Jesus"));
    expect(screen.getAllByRole("link", { name: /Google Maps/ })[0]?.getAttribute("href")).toContain("origin=-15.86%2C-48.03");
    expect(screen.getAllByRole("link", { name: /Waze/ })[0]?.getAttribute("href")).toContain("waze.com");
    expect(screen.getAllByRole("link", { name: /Apple Maps/ })[0]?.getAttribute("href")).toContain("maps.apple.com");
    expect(screen.getAllByRole("link", { name: /OpenStreetMap/ })[0]?.getAttribute("href")).toContain("openstreetmap.org/search?query=");
  });

  it("informa como recuperar o acesso se a localização for recusada", () => {
    const getCurrentPosition = vi.fn((_success, error) => error({ code: 1, PERMISSION_DENIED: 1 }));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    render(<SmartCityMode />);
    fireEvent.click(screen.getByRole("button", { name: /Sincronizar minha localização/ }));
    expect(screen.getByRole("status").textContent).toContain("permissão foi recusada");
  });

  it("permite traçar rota para qualquer local cadastrado e deixa claro o fluxo do OSM", () => {
    const getCurrentPosition = vi.fn(success => success({ coords: { latitude: -15.86, longitude: -48.03 } }));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    render(<SmartCityMode />);
    fireEvent.click(screen.getByRole("button", { name: /Sincronizar minha localização/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Destino no guia ou outro endereço" }), { target: { value: "ESF América" } });
    fireEvent.click(screen.getByRole("option", { name: /ESF América/ }));
    expect(screen.getByText("Rota pronta para")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /OpenStreetMap · buscar/ })[0]?.getAttribute("href")).toContain("openstreetmap.org/search?query=");
  });
});
