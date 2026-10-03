import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PlannerLocationPicker from "./PlannerLocationPicker";
afterEach(cleanup);

it("chooses a bundled point without a geocoder and marks approximate street locations", () => {
  const choose = vi.fn();
  const fetcher = vi.spyOn(globalThis, "fetch");
  try {
    const view = render(<PlannerLocationPicker kind="destino" value="" onChoose={choose} />);
    fireEvent.click(screen.getByRole("button", { name: "Escolher destino no catálogo local" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino local" }), { target: { value: "Avenida Brasília" } });
    fireEvent.click(screen.getByRole("button", { name: /Avenida Brasília/ }));
    expect(choose).toHaveBeenCalledOnce();
    expect(choose.mock.calls[0][0]).toMatch(/^-\d+\.\d+, -\d+\.\d+$/);
    view.rerender(<PlannerLocationPicker kind="destino" value={choose.mock.calls[0][0]} onChoose={choose} />);
    expect(screen.getByText(/não identifica uma casa ou entrada/)).toBeTruthy();
    view.rerender(<PlannerLocationPicker kind="destino" value="Destino editado" onChoose={choose} />);
    expect(screen.queryByText(/não identifica uma casa ou entrada/)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  } finally { fetcher.mockRestore(); }
});


it("includes known geocoding references such as HEAL in the local selector", () => {
  const choose = vi.fn();
  render(<PlannerLocationPicker kind="destino" value="" onChoose={choose} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher destino no catálogo local" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino local" }), { target: { value: "HEAL" } });
  fireEvent.click(screen.getByRole("button", { name: /HEAL/ }));
  expect(choose).toHaveBeenCalledWith("-15.74637, -48.27584");
});

it("chooses an imported company by CNPJ and keeps its approximate precision visible", async () => {
  const choose = vi.fn();
  const view = render(<PlannerLocationPicker kind="destino" value="" onChoose={choose} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher destino no catálogo local" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino local" }), { target: { value: "42.115.689/0001-40" } });
  fireEvent.click(await screen.findByRole("button", { name: /AMAG/ }, { timeout: 5000 }));
  expect(choose).toHaveBeenCalledWith("-15.782635, -48.294036");
  view.rerender(<PlannerLocationPicker kind="destino" value="-15.782635, -48.294036" onChoose={choose} />);
  expect(screen.getByText(/AMAG · Referência aproximada: Quadra/)).toBeTruthy();
});

it("uses the public CNPJ for company origins instead of treating their coordinates as device GPS", async () => {
  const choose = vi.fn();
  render(<PlannerLocationPicker kind="origem" value="" onChoose={choose} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher origem no catálogo local" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar origem local" }), { target: { value: "42.115.689/0001-40" } });
  fireEvent.click(await screen.findByRole("button", { name: /AMAG/ }, { timeout: 5000 }));
  expect(choose).toHaveBeenCalledWith("42.115.689/0001-40");
});

it("reveals more local points and resets pagination when the search changes", () => {
  render(<PlannerLocationPicker kind="destino" value="" onChoose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher destino no catálogo local" }));
  const list = screen.getByRole("list", { name: "Pontos locais para destino" });
  expect(list.querySelectorAll("li")).toHaveLength(8);
  fireEvent.click(screen.getByRole("button", { name: /Mostrar mais pontos/ }));
  expect(list.querySelectorAll("li")).toHaveLength(16);
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino local" }), { target: { value: "HEAL" } });
  expect(list.querySelectorAll("li").length).toBeLessThanOrEqual(8);
  expect(screen.queryByRole("button", { name: /Mostrar mais pontos/ })).toBeNull();
});


it("offers a named road that exists only in the bundled offline road network", () => {
  const choose = vi.fn();
  render(<PlannerLocationPicker kind="destino" value="" onChoose={choose} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher destino no catálogo local" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino local" }), { target: { value: "DF-533" } });
  fireEvent.click(screen.getByRole("button", { name: /DF-533/ }));
  expect(choose).toHaveBeenCalledOnce();
  expect(choose.mock.calls[0][0]).toMatch(/^-d+.d+, -d+.d+$/);
});

it("allows choosing a neighborhood by its verified name without inventing coordinates", () => {
  const choose = vi.fn();
  const view = render(<PlannerLocationPicker kind="destino" value="" onChoose={choose} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher destino no catálogo local" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino local" }), { target: { value: "Jardim Barragem II" } });
  fireEvent.click(screen.getByRole("button", { name: /Jardim Barragem II/ }));
  expect(choose).toHaveBeenCalledWith("Jardim Barragem II, Águas Lindas de Goiás - GO");
  view.rerender(<PlannerLocationPicker kind="destino" value="Jardim Barragem II, Águas Lindas de Goiás - GO" onChoose={choose} />);
  expect(screen.getByText(/precisa de conexão para calcular/)).toBeTruthy();
});
