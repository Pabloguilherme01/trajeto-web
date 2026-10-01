import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MobileBottomNav from "./MobileBottomNav";

const state = vi.hoisted(() => ({
  search: "",
  location: "/planejar",
  staticRuntime: true,
  navigate: vi.fn(),
}));
vi.mock("wouter", () => ({
  useLocation: () => [state.location, state.navigate],
  useSearch: () => state.search,
}));
vi.mock("@/lib/runtimeCapabilities", () => ({ isGitHubPagesRuntime: () => state.staticRuntime }));

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.navigate.mockReset();
  state.search = "";
  state.location = "/planejar";
  state.staticRuntime = true;
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("mobile navigation", () => {
  it("keeps public services in the primary dock", () => {
    state.location = "/";
    render(<MobileBottomNav />);
    fireEvent.click(screen.getByRole("button", { name: "Serviços públicos" }));
    expect(state.navigate).toHaveBeenCalledWith("/servicos");
  });

  it("opens a fresh planner from Rotas instead of silently restoring a previous trip", () => {
    render(<MobileBottomNav />);
    fireEvent.click(screen.getByRole("button", { name: "Rotas" }));
    expect(state.navigate).toHaveBeenCalledWith("/planejar");
  });

  it("keeps route aliases and secondary sections visually grouped", () => {
    state.location = "/salvos";
    render(<MobileBottomNav />);
    expect(
      screen.getByRole("button", { name: "Rotas" }).getAttribute("aria-current")
    ).toBe("page");
    cleanup();
    state.location = "/mapa";
    render(<MobileBottomNav />);
    expect(
      screen
        .getByRole("button", { name: "Mais opções" })
        .getAttribute("aria-current")
    ).toBe("page");
  });

  it("opens More, hides unavailable accounts, navigates to help and closes the dialog", async () => {
    render(<MobileBottomNav />);
    fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Minha conta" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ajuda e offline" }));
    expect(state.navigate).toHaveBeenCalledWith("/ajuda");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("opens Saved routes from the More menu", async () => {
    render(<MobileBottomNav />);
    fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvos" }));
    expect(state.navigate).toHaveBeenCalledWith("/salvos");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

it("keeps Health and Emergency inside the local public directory", async () => {
  render(<MobileBottomNav />);
  fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));
  fireEvent.click(screen.getByRole("button", { name: "Saúde" }));
  expect(state.navigate).toHaveBeenCalledWith("/servicos?categoria=saude");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));
  fireEvent.click(screen.getByRole("button", { name: "Emergência" }));
  expect(state.navigate).toHaveBeenCalledWith("/servicos?emergencia=1#emergency-strip-title");
});

it("returns focus to More after dismissing the menu", async () => {
  render(<MobileBottomNav />);
  const more = screen.getByRole("button", { name: "Mais opções" });
  fireEvent.click(more);
  fireEvent.click(screen.getByRole("button", { name: "Fechar menu" }));
  await waitFor(() => expect(document.activeElement).toBe(more));
});
