import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PwaUpdatePrompt from "./PwaUpdatePrompt";

Object.assign(globalThis, { React });
vi.mock("@/lib/pwa", () => ({ hasWaitingAppUpdate: () => true, pwaUpdateEvent: "trajeto:pwa-update", applyServiceWorkerUpdate: async () => false }));
afterEach(cleanup);

it("shows a waiting update without receiving an event and keeps retry available after activation fails", async () => {
  render(<PwaUpdatePrompt />);
  fireEvent.click(screen.getByRole("button", { name: /^Atualizar$/ }));
  expect(await screen.findByText(/A atualização não foi ativada/)).toBeTruthy();
  expect(screen.getByRole("button", { name: /^Atualizar$/ }).hasAttribute("disabled")).toBe(false);
});

it("uses semantic theme tokens for the update prompt controls", () => {
  render(<PwaUpdatePrompt />);
  const update = screen.getByRole("button", { name: /^Atualizar$/ });
  const close = screen.getByRole("button", { name: /Fechar aviso de atualização/i });
  const panel = update.parentElement;
  expect(panel?.className).toContain("border-border");
  expect(panel?.className).toContain("bg-card/95");
  expect(panel?.className).toContain("text-card-foreground");
  expect(update.className).toContain("bg-primary");
  expect(update.className).toContain("text-primary-foreground");
  expect(close.className).toContain("bg-muted/50");
  expect(close.className).toContain("text-muted-foreground");
  expect(((panel?.className ?? "") + " " + update.className + " " + close.className)).not.toMatch(/(?:bg|text|border)-white|\[#/);
});
