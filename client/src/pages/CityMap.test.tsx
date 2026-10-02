import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  expect(
    screen.getByRole("button", { name: /UPA.*Planejar viagem/ })
  ).toBeTruthy();
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
    "Nenhum item encontrado"
  );
});
it("keeps the destination catalog usable offline without loading street maps", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  render(<CityMap />);
  expect(screen.queryByText("Planejar ponto confirmado")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Saúde" }));
  fireEvent.click(screen.getByRole("button", { name: /UPA.*Planejar viagem/ }));
  expect(navigate).toHaveBeenCalled();
});


it("offers a large-map mode without changing the destination catalog", () => {
  render(<CityMap />);
  const expand = screen.getByRole("button", { name: "Mapa grande" });
  fireEvent.click(expand);
  expect(screen.getByRole("button", { name: "Mapa normal" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Buscar destino no mapa" })).toBeTruthy();
});

it("keeps education as a first-class city layer", () => {
  render(<CityMap />);
  fireEvent.click(screen.getByRole("button", { name: "Educação" }));
  expect(
    screen.getByRole("button", { name: /Cora Coralina.*Planejar viagem/ })
  ).toBeTruthy();
});

it("expands the mobile-friendly catalog on demand with accessible semantics", () => {
  render(<CityMap />);
  const expand = screen.getByRole("button", { name: /Mostrar mais/ });
  expect(expand.getAttribute("aria-controls")).toBe("city-destination-grid");
  expect(expand.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(expand);
  expect(screen.queryByRole("button", { name: /Mostrar mais/ })).toBeNull();
});

it("offers direct mobile actions to open the large map and the planner", () => {
  render(<CityMap />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir mapa" }));
  expect(screen.getByRole("button", { name: "Mapa normal" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Planejar rota" }));
  expect(navigate).toHaveBeenCalledWith(expect.stringContaining("/planejar"));
});
