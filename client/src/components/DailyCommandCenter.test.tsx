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
    expect(screen.getByRole("heading", { name: /deixe o trajeto pronto para o seu dia/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /planejar próxima viagem/i })).toBeInTheDocument();
    expect(screen.getByText(/modo atual/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /acessibilidade/i })).toBeInTheDocument();
  });

  it("opens the saved mode choices", async () => {
    const user = userEvent.setup();
    render(<DailyCommandCenter />);
    await user.click(screen.getByRole("button", { name: /trocar modo/i }));
    expect(screen.getByRole("button", { name: /economia/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sem internet/i })).toBeInTheDocument();
  });
});
