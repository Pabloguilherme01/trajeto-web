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

const state = vi.hoisted(() => ({
  check: vi.fn(),
  prepare: vi.fn(),
  storage: vi.fn(),
  persist: vi.fn(),
}));
vi.mock("@/lib/pwa", () => ({
  getOfflineReadiness: state.check,
  prepareOfflineAccess: state.prepare,
  getOfflineStorageStatus: state.storage,
  requestOfflineStoragePersistence: state.persist,
}));
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.check.mockReset().mockResolvedValue(false);
  state.prepare.mockReset();
  state.storage.mockReset().mockResolvedValue({
    supported: true,
    persisted: false,
    usageBytes: 5 * 1024 * 1024,
    quotaBytes: 100 * 1024 * 1024,
  });
  state.persist.mockReset().mockResolvedValue({
    supported: true,
    persisted: true,
    usageBytes: 5 * 1024 * 1024,
    quotaBytes: 100 * 1024 * 1024,
  });
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function prepareButton() {
  const button = (await screen.findByRole("button", {
    name: "Preparar para ficar offline",
  })) as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
}

describe("offline preparation feedback", () => {
  it("reports ready only after successful preparation", async () => {
    state.prepare.mockResolvedValue({ ready: true });
    render(<OfflineReadiness />);
    fireEvent.click(await prepareButton());
    await screen.findByText("Essencial pronto neste aparelho");
    expect(
      screen.getByRole("button", { name: "Conferir offline" })
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
        screen.queryByText("Essencial pronto neste aparelho")
      ).toBeNull();
      expect(
        (
          screen.getByRole("button", {
            name: "Preparar para ficar offline",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false);
    }
  );
  it("shows practical saved-content counters and can request storage protection", async () => {
    render(<OfflineReadiness />);
    expect(await screen.findByText("Rotas salvas")).toBeTruthy();
    expect(screen.getByText("Serviços salvos")).toBeTruthy();
    const protect = screen.getByRole("button", { name: "Proteger dados salvos" });
    fireEvent.click(protect);
    await waitFor(() => expect(state.persist).toHaveBeenCalled());
    await screen.findByText("Dados protegidos pelo navegador");
  });

  it("recovers its button after an unexpected error", async () => {
    state.prepare.mockRejectedValue(new Error("blocked"));
    render(<OfflineReadiness />);
    fireEvent.click(await prepareButton());
    await screen.findByText(/Conecte-se à internet/);
    expect(
      (
        screen.getByRole("button", {
          name: "Preparar para ficar offline",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });
});
