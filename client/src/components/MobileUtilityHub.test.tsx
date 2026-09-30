import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MobileUtilityHub from "./MobileUtilityHub";

describe("MobileUtilityHub", () => {
  it("prioriza a rotina e permite abrir outro contexto", async () => {
    const user = userEvent.setup();
    render(<MobileUtilityHub />);
    expect(screen.getByRole("button", { name: /Minha rotina/i })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Minha rotina/i }));
    expect(screen.getAllByText("Antes de sair").length).toBeGreaterThan(0);

    const vehicleToggle = () => screen.getAllByRole("button", { name: /Meu veículo/i })
      .find(button => button.getAttribute("aria-controls") === "utility-panel-veiculo");
    await user.click(vehicleToggle()!);
    expect(vehicleToggle()!.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Não deixe o veículo virar surpresa.")).toBeTruthy();

    await user.click(vehicleToggle()!);
    expect(vehicleToggle()!.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Não deixe o veículo virar surpresa.")).toBeNull();
  });
});
