import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InstallAppPrompt, { isAppleMobileDevice } from "./InstallAppPrompt";
import { pwaUpdateEvent } from "@/lib/pwa";

beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: false })) });
  localStorage.clear();
  Object.defineProperty(window.navigator, "maxTouchPoints", { configurable: true, value: 0 });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function offer(prompt = vi.fn().mockResolvedValue(undefined), outcome = "accepted") {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome, platform: "web" }) });
  act(() => { window.dispatchEvent(event); });
}
describe("instalação do app", () => {
  it("recognizes iPadOS when Safari reports a desktop Mac platform", () => {
    vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel");
    Object.defineProperty(window.navigator, "maxTouchPoints", { configurable: true, value: 5 });
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15");
    expect(isAppleMobileDevice()).toBe(true);
    render(<InstallAppPrompt />);
    expect(screen.getByText(/No iPhone:/i)).toBeTruthy();
  });
  it("continues offering installation when local storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<InstallAppPrompt />);
    offer();
    expect(screen.getByRole("button", { name: "Instalar app" })).toBeTruthy();
  });
  it("provides recovery when the browser prompt fails", async () => {
    render(<InstallAppPrompt />);
    offer(vi.fn().mockRejectedValue(new Error("unavailable")));
    fireEvent.click(screen.getByRole("button", { name: "Instalar app" }));
    await screen.findByText(/A instalação não abriu/);
    expect((screen.getByRole("button", { name: "Instalar app" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("closes after dismissal without leaving an unusable prompt", async () => {
    render(<InstallAppPrompt />);
    offer(undefined, "dismissed");
    fireEvent.click(screen.getByRole("button", { name: "Instalar app" }));
    await waitFor(() => expect(screen.queryByLabelText("Instalar Trajeto")).toBeNull());
  });
  it("hides the install prompt when an app update needs attention", () => {
    render(<InstallAppPrompt />);
    offer();
    expect(screen.getByLabelText("Instalar Trajeto")).toBeTruthy();
    act(() => { window.dispatchEvent(new Event(pwaUpdateEvent)); });
    expect(screen.queryByLabelText("Instalar Trajeto")).toBeNull();
  });
  it("closes when the app is installed through another browser entrypoint", () => {
    render(<InstallAppPrompt />);
    offer();
    act(() => { window.dispatchEvent(new Event("appinstalled")); });
    expect(screen.queryByLabelText("Instalar Trajeto")).toBeNull();
  });
});
