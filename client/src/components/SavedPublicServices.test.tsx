// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SavedPublicServices from "./SavedPublicServices";
vi.stubGlobal("React", React);
afterEach(cleanup);
it("opens the specific offline service from the unified saved area", () => {
  render(<SavedPublicServices ids={["upa-mansoes-odisseia", "removed-service"]} />);
  expect(screen.getByRole("link", { name: /UPA Mansões Odisseia/ }).getAttribute("href")).toContain("servico=upa-mansoes-odisseia");
  expect(screen.getByText("Ficha disponível offline")).toBeTruthy();
  expect(screen.queryByText("removed-service")).toBeNull();
});
