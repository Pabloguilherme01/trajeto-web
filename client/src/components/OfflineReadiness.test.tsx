import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OfflineReadiness from "./OfflineReadiness";

const state = vi.hoisted(() => ({ check: vi.fn(), prepare: vi.fn() }));
vi.mock("@/lib/pwa", () => ({
  getOfflineReadiness: state.check,
  offlinePackageReadyEvent: "trajeto:offline-package-ready",
  prepareOfflineAccess: state.prepare,
}));
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.check.mockReset().mockResolvedValue(false);
  state.prepare.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function prepareButton() {
  const button = (await screen.findByRole("button", {
    name: "Preparar acesso offline",
  })) as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
}

describe("offline preparation feedback", () => {
  it("reports ready only after successful preparation", async () => {
    state.prepare.mockResolvedValue({ ready: true });
    render(<OfflineReadiness />);
    fireEvent.click(await prepareButton());
    await screen.findByText("Pronto para usar sem internet neste aparelho.");
    expect(
      screen.getByRole("button", { name: "Conferir acesso offline" })
    ).toBeTruthy();
  });
  it.each(["storage", "connection", "update", "unsupported"])(
    "keeps a retry action when preparation fails: %s",
    async reason => {
      state.prepare.mockResolvedValue({ ready: false, reason });
      render(<OfflineReadiness />);
      fireEvent.click(await prepareButton());
      await act(async () => {});
      expect(
        screen.queryByText("Pronto para usar sem internet neste aparelho.")
      ).toBeNull();
      expect(
        (
          screen.getByRole("button", {
            name: "Preparar acesso offline",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false);
    }
  );
  it("recovers its button after an unexpected error", async () => {
    state.prepare.mockRejectedValue(new Error("blocked"));
    render(<OfflineReadiness />);
    fireEvent.click(await prepareButton());
    await screen.findByText(/Conecte-se à internet/);
    expect(
      (
        screen.getByRole("button", {
          name: "Preparar acesso offline",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });
});
