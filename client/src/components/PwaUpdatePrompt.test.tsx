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
