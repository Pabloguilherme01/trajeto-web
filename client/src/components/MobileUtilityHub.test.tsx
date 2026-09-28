import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MobileUtilityHub from "./MobileUtilityHub";

describe("MobileUtilityHub", () => {
  it("prioriza a rotina e permite abrir outro contexto", async () => {
    const user = userEvent.setup();
    render(<MobileUtilityHub />);
    expect(screen.getByText("Minha rotina")).toBeTruthy();
    expect(screen.getAllByText("Antes de sair").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Meu veículo, abrir seção" }));
    expect(screen.getByRole("button", { name: "Meu veículo, recolher seção" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Não deixe o veículo virar surpresa.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Meu veículo, recolher seção" }));
    expect(screen.getByRole("button", { name: "Meu veículo, abrir seção" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Não deixe o veículo virar surpresa.")).toBeNull();
  });
});
