// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import DailySetupCard from "./DailySetupCard";

describe("DailySetupCard", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("renders the daily setup hub and usable actions", () => {
    render(<DailySetupCard />);
    expect(screen.getByRole("heading", { name: /Deixe o Trajeto pronto para o seu dia/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Destino/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Economia/i })).toBeTruthy();
  });

  it("persists automatic mode when selected", () => {
    render(<DailySetupCard />);
    const button = screen.getByRole("button", { name: /Automático|Usar automático/i });
    fireEvent.click(button);
    expect(localStorage.getItem("trajeto-daily-mode")).toBe("automatico");
  });
});
