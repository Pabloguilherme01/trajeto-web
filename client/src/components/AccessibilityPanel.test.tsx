import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessibilityPanel from "./AccessibilityPanel";

describe("AccessibilityPanel", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("keeps keyboard focus inside the modal dialog", async () => {
    const user = userEvent.setup();
    render(<AccessibilityPanel />);
    await user.click(screen.getAllByRole("button", { name: /abrir acessibilidade/i })[0]);
    const dialog = screen.getByRole("dialog");
    const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    await waitFor(() => expect(document.activeElement).toBe(first));

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);

    first.focus();
    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);
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

it("offers deletion for a GPS handoff with no permanent data", async () => {
  localStorage.clear();
  const user = userEvent.setup();
  render(<AccessibilityPanel />);
  await user.click(screen.getAllByRole("button", { name: /abrir acessibilidade/i })[0]);
  expect(screen.getByRole("button", { name: /limpar dados do trajeto/i })).toBeTruthy();
  cleanup();
});

it("reports failed deletion instead of claiming all data was removed", async () => {
  localStorage.setItem("trajeto-blocked", "private");
  const user = userEvent.setup();
  render(<AccessibilityPanel />);
  await user.click(screen.getAllByRole("button", { name: /abrir acessibilidade/i })[0]);
  await user.click(screen.getByRole("button", { name: /limpar dados do trajeto/i }));
  const blocked = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  try {
    await user.click(screen.getByRole("button", { name: /confirmar limpeza/i }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText(/dados locais removidos/i)).toBeNull();
  } finally {
    blocked.mockRestore();
    cleanup();
    localStorage.clear();
  }
});
