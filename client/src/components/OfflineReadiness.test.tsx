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
  getOfflinePackageStatus: async () => ({ ready: await state.check() }),
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
  it("shows real download progress and waits for final verification", async () => {
    let complete!: (value: { ready: boolean }) => void;
    state.prepare.mockImplementation(async (notify: (progress: unknown) => void) => {
      notify({ stage: "downloading", completed: 3, total: 10 });
      return new Promise(resolve => { complete = resolve; });
    });
    render(<OfflineReadiness />);
    fireEvent.click(await prepareButton());
    await screen.findByText("Salvando arquivos: 3 de 10…");
    expect(screen.getByRole("progressbar").getAttribute("value")).toBe("3");
    expect(screen.queryByText("Pronto para usar sem internet neste aparelho.")).toBeNull();
    await act(async () => complete({ ready: true }));
    await screen.findByText("Pronto para usar sem internet neste aparelho.");
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
  it("keeps a successful result when controllerchange fires during preparation", async () => {
    const worker = new EventTarget();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: worker,
    });
    let finish!: (result: { ready: boolean }) => void;
    state.prepare.mockImplementation(() =>
      new Promise(resolve => { finish = resolve; })
    );
    // A concurrent status probe never finishes: the UI must not wait for it.
    state.check.mockResolvedValueOnce(false)
      .mockImplementationOnce(() => new Promise(() => {}));
    try {
      render(<OfflineReadiness />);
      fireEvent.click(await prepareButton());
      act(() => { worker.dispatchEvent(new Event("controllerchange")); });
      await act(async () => finish({ ready: true }));
      expect(await screen.findByText("Pronto para usar sem internet neste aparelho.")).toBeTruthy();
      expect(state.check).toHaveBeenCalledTimes(1);
    } finally {
      delete (navigator as unknown as { serviceWorker?: EventTarget }).serviceWorker;
    }
  });

  it("ignores an outdated readiness check after a newer controller event", async () => {
    const worker = new EventTarget();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: worker,
    });
    let finishStale!: (ready: boolean) => void;
    state.check
      .mockImplementationOnce(() => new Promise(resolve => { finishStale = resolve; }))
      .mockResolvedValueOnce(true);
    try {
      render(<OfflineReadiness />);
      await act(async () => { worker.dispatchEvent(new Event("controllerchange")); });
      expect(await screen.findByText("Pronto para usar sem internet neste aparelho.")).toBeTruthy();
      await act(async () => { finishStale(false); });
      expect(screen.getByText("Pronto para usar sem internet neste aparelho.")).toBeTruthy();
      expect(state.check).toHaveBeenCalledTimes(2);
    } finally {
      delete (navigator as unknown as { serviceWorker?: EventTarget }).serviceWorker;
    }
  });

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
