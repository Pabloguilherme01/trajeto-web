import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MobileUtilityHub from "./MobileUtilityHub";

describe("MobileUtilityHub", () => {
  it("prioriza a rotina e permite abrir outro contexto", async () => {
    const user = userEvent.setup();
    render(<MobileUtilityHub />);
    expect(screen.getByText("Minha rotina")).toBeTruthy();
    expect(screen.getByText("Antes de sair")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Meu veículo/i }));
    expect(screen.getByText("Meu veículo")).toBeTruthy();
    expect(screen.getByText("Dados de manutenção ficam neste aparelho.")).toBeTruthy();
  });
});
