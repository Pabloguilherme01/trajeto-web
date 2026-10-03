import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CityMap from "./CityMap";
const navigate = vi.hoisted(() => vi.fn());
vi.mock("wouter", () => ({
  useLocation: () => ["/mapa", navigate],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/TileStationMap", () => ({
  default: ({ stations, onPlanDestination }: any) => (
    <button onClick={() => onPlanDestination(stations[0])}>
      Planejar ponto confirmado
    </button>
  ),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  navigate.mockClear();
});
it("filters accent-insensitive destinations and carries the selected destination to the planner", () => {
  render(<CityMap />);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Buscar destino no mapa" }),
    { target: { value: "odisseia" } }
  );
  const upaCard = screen.getByText("UPA").closest("article");
  expect(upaCard).toBeTruthy();
  const plannerLink = within(upaCard!).getByRole("link", { name: "Ir até aqui" });
  expect(decodeURIComponent(plannerLink.getAttribute("href") || "")).toContain(
    "destino=UPA Mansões Odisseia"
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Planejar ponto confirmado" })
  );
  expect(decodeURIComponent(navigate.mock.calls[0][0])).toContain(
    "destino=UPA Mansões Odisseia"
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "xxxxxxxxx" },
  });
  expect(screen.getByRole("status").textContent).toContain(
    "Nenhum destino encontrado"
  );
});
it("keeps the destination catalog usable offline without loading street maps", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  render(<CityMap />);
  expect(screen.queryByText("Planejar ponto confirmado")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Saúde" }));
  const upaCard = screen.getByText("UPA").closest("article");
  expect(upaCard).toBeTruthy();
  const plannerLink = within(upaCard!).getByRole("link", { name: "Ir até aqui" });
  expect(decodeURIComponent(plannerLink.getAttribute("href") || "")).toContain(
    "destino=UPA Mansões Odisseia"
  );
});
