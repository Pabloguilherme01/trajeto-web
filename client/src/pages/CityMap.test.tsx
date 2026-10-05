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
  expect(
    screen.getByText(/destino\(s\) na lista · \d+ posição\(ões\) no mapa para “odisseia”/)
  ).toBeTruthy();
  const plannerLink = screen.getAllByRole("link", { name: "Ir até aqui" }).find(link =>
    decodeURIComponent((link.getAttribute("href") || "").replace(/\+/g, " "))
      .includes("destino=UPA Mansões Odisseia")
  );
  expect(plannerLink).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Planejar ponto confirmado" })
  );
  expect(
    decodeURIComponent(String(navigate.mock.calls[0][0]).replace(/\+/g, " "))
  ).toContain("destino=-15.77665, -48.27935");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "xxxxxxxxx" },
  });
  expect(
    screen.getByText("Nenhum destino encontrado. Tente outro nome ou categoria.")
  ).toBeTruthy();
});
it("keeps the destination catalog usable offline without loading street maps", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  render(<CityMap />);
  expect(screen.queryByText("Planejar ponto confirmado")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Saúde" }));
  const plannerLink = screen.getAllByRole("link", { name: "Ir até aqui" }).find(link =>
    decodeURIComponent((link.getAttribute("href") || "").replace(/\+/g, " "))
      .includes("destino=UPA Mansões Odisseia")
  );
  expect(plannerLink).toBeTruthy();
});


it("filters bundled streets offline and clears a street search", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  render(<CityMap />);
  fireEvent.click(screen.getByRole("button", { name: "Ruas e avenidas" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Avenida Brasília" } });
  expect(screen.getAllByText("Avenida Brasília", { selector: "article p" }).length).toBeGreaterThan(1);
  expect(screen.getByText(/Centro aproximado da via: -15.73723, -48.28041/)).toBeTruthy();
  expect(screen.queryByText(/Nenhum destino encontrado/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca do mapa" }));
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
});

it("filters education routes without mixing health or shopping destinations", () => {
  render(<CityMap />);
  fireEvent.click(screen.getByRole("button", { name: "Educação" }));
  expect(screen.getByRole("button", { name: "Educação" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Cora Coralina", { exact: true })).toBeTruthy();
  expect(screen.queryByText("UPA", { exact: true })).toBeNull();
  expect(screen.queryByText("Supermercado Tatico", { exact: true })).toBeNull();
});


it("keeps map categories in a compact horizontal rail on mobile", () => {
  render(<CityMap />);
  const categories = screen.getByRole("group", { name: "Categorias do mapa" });
  expect(categories.className).toContain("overflow-x-auto");
  expect(categories.className).toContain("snap-x");
});

it("keeps quick filters compatible when switching categories and street mode", () => {
  render(<CityMap />);
  const search = screen.getByRole("textbox", { name: "Buscar destino no mapa" }) as HTMLInputElement;
  const quickFilters = screen.getByRole("group", { name: "Filtros rápidos do mapa" });
  fireEvent.click(within(quickFilters).getByRole("button", { name: "Postos" }));
  expect(search.value).toBe("posto");
  const categories = screen.getByRole("group", { name: "Categorias do mapa" });
  expect(within(categories).getByRole("button", { name: "Postos" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Saúde" }));
  expect(search.value).toBe("");
  fireEvent.click(within(quickFilters).getByRole("button", { name: "UPA" }));
  expect(search.value).toBe("upa");
  fireEvent.click(screen.getByRole("button", { name: "Ruas e avenidas" }));
  expect(search.value).toBe("");
  expect(screen.getByRole("button", { name: "Ruas e avenidas" }).getAttribute("aria-pressed")).toBe("true");
});
