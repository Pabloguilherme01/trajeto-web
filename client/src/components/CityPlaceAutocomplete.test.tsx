import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CityPlaceAutocomplete from "./CityPlaceAutocomplete";

describe("busca compartilhada de pontos da cidade", () => {
  afterEach(cleanup);

  it("sugere os principais destinos ao focar e escolhe um sem sair do campo", () => {
    const onValueChange = vi.fn();
    const onPlaceSelect = vi.fn();
    render(<CityPlaceAutocomplete id="place" value="" onValueChange={onValueChange} onPlaceSelect={onPlaceSelect} placeholder="Procure um ponto" />);
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    expect(screen.getByRole("option", { name: /Hospital Municipal Bom Jesus/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /BR-070/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: /Rodoviária Nelson Alves/ }));
    expect(onPlaceSelect.mock.calls[0]?.[0].id).toBe("terminal-nelson-alves");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("filtra os locais quando a pessoa começa a digitar", () => {
    function ControlledInput() {
      const [value, setValue] = React.useState("");
      return <CityPlaceAutocomplete id="filter-place" value={value} onValueChange={setValue} onPlaceSelect={() => {}} placeholder="Ponto" />;
    }
    render(<ControlledInput />);
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "br-070" } });
    expect(screen.getByRole("option", { name: /BR-070/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Hospital Municipal/ })).toBeNull();
  });
});
