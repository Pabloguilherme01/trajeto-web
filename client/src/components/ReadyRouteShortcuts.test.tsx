import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ReadyRouteShortcuts from "./ReadyRouteShortcuts";
import { LOCAL_READY_ROUTES } from "@/lib/localRoutePresets";
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/", navigate] }));
afterEach(() => { cleanup(); navigate.mockReset(); });
function open() {
  fireEvent.click(screen.getByText(/trajetos prontos pela cidade/));
}
it("finds routes without accents, filters categories and recovers an empty search", () => {
  render(<ReadyRouteShortcuts />); open();
  expect(screen.getAllByRole("article")).toHaveLength(6);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "rodoviaria" } });
  const routes = screen.getAllByRole("article");
  expect(routes.length).toBeGreaterThan(0);
  expect(routes.every(item => item.getAttribute("aria-label")?.includes("Rodoviária"))).toBe(true);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "UPA" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Tipo de destino" }), { target: { value: "saude" } });
  expect(screen.getAllByRole("article").every(item => /UPA|HEAL|Hospital/.test(item.getAttribute("aria-label")!))).toBe(true);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nao existe" } });
  expect(screen.queryAllByRole("article")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  fireEvent.click(screen.getByRole("button", { name: /Ver mais/ }));
  expect(screen.getAllByRole("article")).toHaveLength(18);
  fireEvent.click(screen.getByRole("button", { name: "Mostrar menos trajetos" }));
  expect(screen.getAllByRole("article")).toHaveLength(6);
});
it("opens the return trip with swapped endpoints and the chosen travel mode", () => {
  render(<ReadyRouteShortcuts />); open();
  fireEvent.change(screen.getByRole("combobox", { name: "Como você vai?" }), { target: { value: "walking" } });
  fireEvent.click(screen.getByRole("button", { name: "Calcular volta: UPA → Centro (referência)" }));
  const url = new URL(navigate.mock.calls[0][0], "https://example.com");
  expect(url.searchParams.get("origem")).toBe(LOCAL_READY_ROUTES[0].destination);
  expect(url.searchParams.get("destino")).toBe(LOCAL_READY_ROUTES[0].origin);
  expect(url.searchParams.get("modo")).toBe("walking");
  expect(url.searchParams.get("auto")).toBe("1");
});
it("inherits changes to the planner travel mode without resetting search", () => {
  const view = render(<ReadyRouteShortcuts compact initialMode="walking" />); open();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "HEAL" } });
  view.rerender(<ReadyRouteShortcuts compact initialMode="cycling" />);
  expect((screen.getByRole("combobox", { name: "Como você vai?" }) as HTMLSelectElement).value).toBe("cycling");
  expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("HEAL");
});

it("filters departure points and resets them together with other filters", () => {
  render(<ReadyRouteShortcuts />); open();
  const departure = screen.getByRole("combobox", { name: "Saindo de" });
  fireEvent.change(departure, { target: { value: "via-osm-0da29ee8ad6a" } });
  const cards = screen.getAllByRole("article");
  expect(cards.length).toBeGreaterThan(0);
  expect(cards.every(card => card.getAttribute("aria-label")?.startsWith("Avenida JK →"))).toBe(true);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "UPA" } });
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByText(/Referência aproximada/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect((departure as HTMLSelectElement).value).toBe("todos");
  expect(screen.getAllByRole("article")).toHaveLength(6);
});


it("applies an intent without losing departure and calculates with the quick travel mode", () => {
  render(<ReadyRouteShortcuts />); open();
  fireEvent.change(screen.getByRole("combobox", { name: "Saindo de" }), { target: { value: "via-osm-0da29ee8ad6a" } });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "não existe" } });
  fireEvent.click(screen.getByRole("button", { name: "Cuidar da saúde" }));
  expect(screen.getByRole("button", { name: "Cuidar da saúde" }).getAttribute("aria-pressed")).toBe("true");
  expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
  expect((screen.getByRole("combobox", { name: "Saindo de" }) as HTMLSelectElement).value).toBe("via-osm-0da29ee8ad6a");
  expect(screen.getAllByRole("article").every(card => /UPA|HEAL|Hospital|UBS|ESF/.test(card.getAttribute("aria-label")!))).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "A pé" }));
  fireEvent.click(screen.getAllByRole("button", { name: /^Calcular Avenida JK/ })[0]);
  const url = new URL(navigate.mock.calls[0][0], "https://example.com");
  expect(url.searchParams.get("modo")).toBe("walking");
  expect(url.searchParams.get("auto")).toBe("1");
  expect(url.searchParams.has("lat")).toBe(false);
  expect(url.searchParams.has("lng")).toBe(false);
});
it("forces offline calculation and preserves the return direction and travel mode", () => {
  render(<ReadyRouteShortcuts initialMode="cycling" />); open();
  fireEvent.click(screen.getByRole("button", { name: "Calcular offline" }));
  expect(screen.getByRole("button", { name: "Calcular offline" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Calcular volta: UPA → Centro (referência)" }));
  const url = new URL(navigate.mock.calls[0][0], "https://example.com");
  expect(url.searchParams.get("experiencia")).toBe("offline");
  expect(url.searchParams.get("modo")).toBe("cycling");
  expect(url.searchParams.get("origem")).toContain("UPA");
  expect(url.searchParams.get("auto")).toBe("1");
});
