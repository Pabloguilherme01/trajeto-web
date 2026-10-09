import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RouteLoading from "./RouteLoading";

afterEach(() => { cleanup(); vi.useRealTimers(); });
it("offers an explicit recovery after a stalled route, without automatic reload loops", () => {
  vi.useFakeTimers();
  render(<RouteLoading />);
  expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole("status").textContent).toContain("Esta tela está demorando");
  expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Ir ao início" }).getAttribute("href")).toBe(import.meta.env.BASE_URL);
});
it("cleans up the recovery timer once the route loads", () => {
  vi.useFakeTimers();
  const view = render(<RouteLoading />);
  expect(vi.getTimerCount()).toBe(1);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
