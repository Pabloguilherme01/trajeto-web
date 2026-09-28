// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

function installLocalStorageMock() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
  });
}
import { fireEvent, render, screen } from "@testing-library/react";
import FuelLogCard from "./FuelLogCard";

describe("FuelLogCard", () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("registra e exibe um abastecimento", () => {
    render(<FuelLogCard />);
    fireEvent.change(screen.getByLabelText("Litros"), { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("Valor total"), { target: { value: "240" } });
    fireEvent.change(screen.getByLabelText("Observação (opcional)"), { target: { value: "Posto habitual" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    expect(screen.getByText(/6,00/)).toBeTruthy();
    expect(screen.getByText(/40 L/)).toBeTruthy();
    expect(screen.getByText(/Posto habitual/)).toBeTruthy();
  });

  it("mostra o gasto acumulado e permite remover", () => {
    render(<FuelLogCard />);
    fireEvent.change(screen.getByLabelText("Litros"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Valor total"), { target: { value: "180" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    expect(screen.getByText(/180,00/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Remover abastecimento/ }));
    expect(screen.getByText("Registros")).toBeTruthy();
  });
});
