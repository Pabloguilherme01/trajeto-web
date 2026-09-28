// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DailyNowCard from "./DailyNowCard";

vi.mock("@/lib/offlineStore", () => ({
  listOfflineRoutes: vi.fn(async () => []),
  offlineRouteEvent: "trajeto-offline-route",
}));

describe("DailyNowCard", () => {
  afterEach(() => cleanup());
  it("renders a real primary action for a new user", async () => {
    render(<DailyNowCard />);
    expect(screen.getByRole("heading", { name: /Prepare sua próxima viagem|Sua próxima viagem/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir agora/i })).toBeTruthy();
  });
});
