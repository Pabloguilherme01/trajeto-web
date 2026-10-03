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
