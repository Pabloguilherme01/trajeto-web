// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DestinationResourceModes from "./DestinationResourceModes";
afterEach(cleanup);

it("shows accessible previews and preserves zero-result modes while updating", () => {
  const onChange = vi.fn();
  const props = { value: "all" as const, counts: { all: 10, coordinates: 1, missing: 9, streets: 0, areas: 68, prepared: 0 }, onChange, streets: true };
  const { rerender } = render(<DestinationResourceModes {...props} />);
  const group = screen.getByRole("group", { name: "Recursos dos destinos" });
  const streets = within(group).getByRole("button", { name: "Ruas e avenidas" });
  expect(within(streets).getByText("0 destinos")).toBeTruthy();
  expect(streets.hasAttribute("disabled")).toBe(false);
  fireEvent.click(streets);
  expect(onChange).toHaveBeenCalledWith("streets");
  const coordinates = within(group).getByRole("button", { name: "Com coordenadas" });
  expect(within(coordinates).getByText("1 destino").id).toBe(coordinates.getAttribute("aria-describedby"));
  rerender(<DestinationResourceModes {...props} updating />);
  expect(within(group).getAllByText("Atualizando")).toHaveLength(6);
  expect(within(group).getByRole("button", { name: "Rota offline salva" })).toBeTruthy();
  const areas = within(group).getByRole("button", { name: "Bairros e setores" });
  expect(within(areas).getByText("Atualizando")).toBeTruthy();
  fireEvent.click(areas);
  expect(onChange).toHaveBeenCalledWith("areas");
  expect(within(group).queryByText("10 destinos")).toBeNull();
  rerender(<DestinationResourceModes {...props} />);
  expect(within(areas).getByText("68 destinos")).toBeTruthy();
});

it("keeps the map's three availability modes apart from the planner's street catalog", () => {
  const onChange = vi.fn();
  render(<DestinationResourceModes value="coordinates" counts={{ all: 3, coordinates: 2, missing: 1 }} onChange={onChange} />);
  const group = screen.getByRole("group", { name: "Recursos dos destinos" });
  expect(within(group).getAllByRole("button")).toHaveLength(3);
  expect(within(group).getByRole("button", { name: "Com coordenadas" }).getAttribute("aria-pressed")).toBe("true");
  const missing = within(group).getByRole("button", { name: "Sem coordenadas" });
  expect(within(missing).getByText("1 destino")).toBeTruthy();
  fireEvent.click(missing);
  expect(onChange).toHaveBeenCalledWith("missing");
});
