import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import City from "./City";

describe("guia da cidade", () => {
  afterEach(cleanup);
  it("mostra pontos úteis e abre o destino em um mapa", () => {
    render(<City />);
    expect(screen.getByRole("heading", { name: /A cidade inteira/ })).toBeTruthy();
    expect(screen.getByText("Hospital Municipal Bom Jesus")).toBeTruthy();
    expect(screen.getByText("Hospital Estadual de Águas Lindas (HEAL)")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Traçar rota/ })[0]?.getAttribute("href")).toContain("google.com/maps/dir");
  });

  it("filtra transporte e permite buscar uma unidade de saúde por bairro", () => {
    render(<City />);
    const filters = within(screen.getByRole("group", { name: "Filtrar por categoria" }));
    fireEvent.click(filters.getByRole("button", { name: "Transporte" }));
    expect(screen.getByText("Rodoviária Nelson Alves de Sousa")).toBeTruthy();
    expect(screen.queryByText("Hospital Municipal Bom Jesus")).toBeNull();

    fireEvent.click(filters.getByRole("button", { name: "Saúde" }));
    fireEvent.change(screen.getByRole("textbox", { name: "O que você procura?" }), { target: { value: "Barragem" } });
    expect(screen.getByText("UBS Barragem II")).toBeTruthy();
    expect(screen.queryByText("Rodoviária Nelson Alves de Sousa")).toBeNull();
  });
});
