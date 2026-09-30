import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import QuickResolver from "./QuickResolver";

const setLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["", setLocation],
}));

describe("QuickResolver", () => {
  it("abre diretamente um ponto pronto offline", () => {
    render(<QuickResolver />);
    fireEvent.change(screen.getByLabelText("Resolver uma necessidade"), {
      target: { value: "Vapt Vupt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resolver busca" }));
    expect(setLocation).toHaveBeenCalledWith("/local/vapt-vupt");
  });

  it("mantém busca genérica de saúde no mapa", () => {
    render(<QuickResolver />);
    fireEvent.change(screen.getByLabelText("Resolver uma necessidade"), {
      target: { value: "hospital" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resolver busca" }));
    expect(setLocation.mock.calls.at(-1)?.[0]).toContain("/mapa?q=hospital");
  });

  it("manda intenção de navegação para o planejador", () => {
    render(<QuickResolver />);
    fireEvent.change(screen.getByLabelText("Resolver uma necessidade"), {
      target: { value: "como chegar ao hospital" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resolver busca" }));
    expect(setLocation.mock.calls.at(-1)?.[0]).toContain("/planejar?offline=1&destino=");
  });
});
