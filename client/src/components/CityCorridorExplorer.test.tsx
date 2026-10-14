import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { CityAtlasItem } from "@/lib/cityAtlas";
import CityCorridorExplorer from "./CityCorridorExplorer";

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));
afterEach(() => cleanup());

const shops = [
  { id: "shop-a", name: "Loja Central", address: "Av. JK, Quadra 20", business: { cnpj: "111" } },
  { id: "shop-b", name: "CNPJ 12.345.678/0001-90", address: "Avenida JK Qd 21", business: { cnpj: "222" } },
  { id: "shop-c", name: "Loja Av 1", address: "Avenida 1, Parque da Barragem", business: { cnpj: "333" } },
  { id: "shop-d", name: "Loja Av 10", address: "Avenida 10, Parque da Barragem", business: { cnpj: "444" } },
] as CityAtlasItem[];

it("shows sourced bus proximity without claiming avenue itineraries and separates CNPJ-only rows", () => {
  render(<CityCorridorExplorer businesses={shops} commercialCatalogLoaded />);
  fireEvent.click(screen.getByText("Corredores da cidade · ônibus, comércio e serviços"));
  expect(screen.getByText("Linhas municipais com parada nomeada nesta via")).toBeTruthy();
  expect(screen.getByText("Linha 102")).toBeTruthy();
  expect(screen.getByText("Linha 103")).toBeTruthy();
  expect(screen.getByText("Linha 105")).toBeTruthy();
  expect(screen.getByText("Linhas relatadas nas proximidades")).toBeTruthy();
  expect(screen.getByText("100 · 2304 · 2402 · 2424 · 2862")).toBeTruthy();
  expect(screen.getByText(/1 empresas com nome · 1 registros apenas cadastrais/)).toBeTruthy();
  expect(screen.getByText(/Loja Central/)).toBeTruthy();
  expect(screen.queryByText(/CNPJ 12.345.678\/0001-90/)).toBeNull();
  const streetLink = screen.getByRole("link", { name: "Localizar via no mapa de ruas" });
  expect(streetLink.getAttribute("href")).toContain("camada=ruas");
});

it("switches to avenue 1 without colliding with Avenida 10 or inventing local bus lines", () => {
  render(<CityCorridorExplorer businesses={shops} commercialCatalogLoaded />);
  fireEvent.click(screen.getByText("Corredores da cidade · ônibus, comércio e serviços"));
  fireEvent.change(screen.getByRole("combobox", { name: "Avenida ou corredor" }), { target: { value: "avenida-1" } });
  expect(screen.getByText(/1 empresas com nome · 0 registros apenas cadastrais/)).toBeTruthy();
  expect(screen.getByText(/Loja Av 1/)).toBeTruthy();
  expect(screen.queryByText(/Loja Av 10/)).toBeNull();
  expect(screen.getByText(/Ainda não há itinerário por trecho/)).toBeTruthy();
});

it("does not display a false zero when the optional 21k-company catalog is unloaded", () => {
  render(<CityCorridorExplorer businesses={[]} commercialCatalogLoaded={false} />);
  fireEvent.click(screen.getByText("Corredores da cidade · ônibus, comércio e serviços"));
  expect(screen.getByText(/Catálogo comercial completo não carregado nesta camada/)).toBeTruthy();
});
