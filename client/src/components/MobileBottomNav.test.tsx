import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MobileBottomNav from "./MobileBottomNav";

const state = vi.hoisted(() => ({ search: "", staticRuntime: true, navigate: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/planejar", state.navigate], useSearch: () => state.search }));
vi.mock("@/lib/mobilePreferences", () => ({ getLastTrip: () => null, mobilePreferenceEvent: "preference-change" }));
vi.mock("@/lib/offlineStore", () => ({ listOfflineRoutes: async () => [], offlineRouteEvent: "route-change" }));
vi.mock("@/lib/runtimeCapabilities", () => ({ isGitHubPagesRuntime: () => state.staticRuntime }));

beforeEach(() => { vi.stubGlobal("React", React); state.navigate.mockReset(); state.search = ""; state.staticRuntime = true; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("mobile navigation", () => {
  it("opens More, hides unavailable accounts, navigates to help and closes the dialog", async () => {
    render(<MobileBottomNav />);
    fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Minha conta" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ajuda e uso offline" }));
    expect(state.navigate).toHaveBeenCalledWith("/ajuda");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("marks only Saved as active for a saved-routes query", () => {
    state.search = "salvos=1";
    render(<MobileBottomNav />);
    expect(screen.getByRole("button", { name: "Salvos" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Planejar" }).getAttribute("aria-current")).toBeNull();
  });
});
