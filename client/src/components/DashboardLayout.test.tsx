import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DashboardLayout from "./DashboardLayout";
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, user: null }) }));
beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("shows the access screen even when browser storage access is denied", () => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  render(<DashboardLayout><p>Private content</p></DashboardLayout>);
  expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
  expect(screen.queryByText("Private content")).toBeNull();
});
