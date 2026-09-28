import React from "react";
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DailyCommandCenter from "./DailyCommandCenter";

describe("DailyCommandCenter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the mobile command center with the primary actions", () => {
    render(<DailyCommandCenter />);
    expect(screen.getByRole("heading", { name: /deixe o trajeto pronto para o seu dia/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /planejar próxima viagem/i })).toBeTruthy();
    expect(screen.getByText(/modo atual/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /acessibilidade/i })).toBeTruthy();
  });

  it("offers first-run destination setup when nothing is saved", async () => {
    const user = userEvent.setup();
    render(<DailyCommandCenter />);
    const input = screen.getByRole("textbox", { name: /Destino principal/i });
    await user.type(input, "Trabalho");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(localStorage.getItem("trajeto-mobile-destinations")).toContain("Trabalho");
    expect(localStorage.getItem("trajeto-daily-mode")).toBe("automatico");
  });

  it("opens the saved mode choices", async () => {
    const user = userEvent.setup();
    render(<DailyCommandCenter />);
    await user.click(screen.getByRole("button", { name: /trocar modo/i }));
    expect(screen.getByRole("button", { name: /economia/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /sem internet/i })).toBeTruthy();
  });
});
