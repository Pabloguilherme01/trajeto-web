// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DestinationAreaSelect from "./DestinationAreaSelect";
afterEach(cleanup);
it("offers sourced areas in a native, accessible mobile picker", () => {
  const onChange = vi.fn();
  render(<DestinationAreaSelect value="" onChange={onChange}/>);
  const picker = screen.getByRole("combobox", { name: "Filtrar destinos por bairro ou setor" });
  expect(picker.querySelectorAll("option").length).toBeGreaterThan(60);
  fireEvent.change(picker, { target: { value: "bairro-jardim-brasilia" } });
  expect(onChange).toHaveBeenCalledWith("bairro-jardim-brasilia");
  expect(screen.getByText(/não representa limites geográficos/)).toBeTruthy();
});
