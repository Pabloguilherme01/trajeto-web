import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessibilityPanel from "./AccessibilityPanel";

describe("AccessibilityPanel", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("offers local data controls without touching unrelated storage", async () => {
    const user = userEvent.setup();
    localStorage.setItem("trajeto-daily-mode", "automatico");
    localStorage.setItem("other-app-setting", "keep");
    render(<AccessibilityPanel />);
    await user.click(screen.getAllByRole("button", { name: /abrir acessibilidade/i })[0]);
    expect(screen.getByText(/dados deste aparelho/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /limpar dados do trajeto/i }));
    await user.click(screen.getByRole("button", { name: /confirmar limpeza/i }));
    expect(localStorage.getItem("trajeto-daily-mode")).toBeNull();
    expect(localStorage.getItem("other-app-setting")).toBe("keep");
    expect(screen.getByText(/nenhum dado local do trajeto está salvo/i)).toBeTruthy();
  });
});
