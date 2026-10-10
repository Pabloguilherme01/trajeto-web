import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CityMap from "./CityMap";
const navigate = vi.hoisted(() => vi.fn());
const catalog = vi.hoisted(() => ({ items: [] as any[], loading: false, error: false, retry: vi.fn() }));
const mapSearch = vi.hoisted(() => ({ value: "" }));
const catalogEnabled = vi.hoisted(() => ({ values: [] as boolean[] }));
vi.mock("@/hooks/useBusinessCatalog", () => ({ useBusinessCatalog: (enabled = true) => { catalogEnabled.values.push(enabled); return catalog; } }));
vi.mock("wouter", () => ({
  useSearch: () => mapSearch.value,
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
  catalog.items = [];
  mapSearch.value = "";
  catalogEnabled.values = [];
});
it("mounts initial stops in batches and still searches the full catalog", () => {
  render(<CityMap />);
  const stops = screen.getByRole("region", { name: "Escolha sua próxima parada" });
  expect(within(stops).getAllByRole("article")).toHaveLength(18);
  fireEvent.click(within(stops).getByRole("button", { name: /Mostrar mais paradas/ }));
  expect(within(stops).getAllByRole("article")).toHaveLength(36);
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino no mapa" }), { target: { value: "Sala do Empreendedor" } });
  expect(within(stops).getByText("Sala do Empreendedor · Águas Lindas")).toBeTruthy();
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
it("lets the city map choose Organic Maps as the preferred navigation app", () => {
  localStorage.clear();
  render(<CityMap />);
  const select = screen.getByRole("combobox", { name: "Aplicativo de mapa preferido" });
  fireEvent.change(select, { target: { value: "organic" } });
  expect((select as HTMLSelectElement).value).toBe("organic");
  expect(
    JSON.parse(localStorage.getItem("trajeto-navigation-preferences") || "{}").provider
  ).toBe("organic");
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
  expect(screen.queryByText("UPA", { exact: true, selector: "article p" })).toBeNull();
  expect(screen.queryByText("Supermercado Tatico", { exact: true, selector: "article p" })).toBeNull();
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

it("uses the same pharmacy and workshop aliases as search without mixing map categories", () => {
  catalog.items = [
    { id: "business-1", name: "Drogaria teste", category: "compras", detail: "Comércio de produtos farmacêuticos", destination: "Drogaria teste, Águas Lindas", sourceLabel: "Arquivo importado", lat: -15.77, lng: -48.28 },
    { id: "business-2", name: "Mecânica teste", category: "servicos", detail: "Reparação mecânica", destination: "Mecânica teste, Águas Lindas", sourceLabel: "Arquivo importado", lat: -15.77, lng: -48.28 },
  ];
  render(<CityMap />);
  const shortcuts = screen.getByRole("group", { name: "Filtros rápidos do mapa" });
  fireEvent.click(within(shortcuts).getByRole("button", { name: "Farmácias" }));
  expect(screen.getByText("Drogaria teste", { selector: "article p" })).toBeTruthy();
  expect(screen.queryByText("Mecânica teste", { selector: "article p" })).toBeNull();
  fireEvent.click(within(screen.getByRole("group", { name: "Categorias do mapa" })).getByRole("button", { name: "Tudo" }));
  fireEvent.click(within(shortcuts).getByRole("button", { name: "Oficinas" }));
  expect(screen.getByText("Mecânica teste", { selector: "article p" })).toBeTruthy();
  expect(screen.queryByText("Drogaria teste", { selector: "article p" })).toBeNull();
});


it("does not hide a company sharing a public destination address", () => {
  catalog.items = [{ id: "business-test", name: "Empresa UPA no mesmo endereço", category: "saude", destination: "UPA Mansões Odisseia, Águas Lindas de Goiás, GO", sourceLabel: "Arquivo importado", lat: -15.77, lng: -48.28 }];
  render(<CityMap />);
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino no mapa" }), { target: { value: "upa" } });
  expect(screen.getByText("Empresa UPA no mesmo endereço", { selector: "article p" })).toBeTruthy();
});


it("switches directly between quick filters in different categories", () => {
  catalog.items = [
    { id: "business-clothes", name: "Loja teste", category: "compras", detail: "Artigos do vestuário", destination: "Loja teste", sourceLabel: "Arquivo" },
    { id: "business-beauty", name: "Salão teste", category: "servicos", detail: "Cabeleireiros", destination: "Salão teste", sourceLabel: "Arquivo" },
    { id: "business-materials", name: "Ferragens teste", category: "compras", detail: "Ferragens", destination: "Ferragens teste", sourceLabel: "Arquivo" },
  ];
  render(<CityMap />);
  const shortcuts = screen.getByRole("group", { name: "Filtros rápidos do mapa" });
  for (const [label, name] of [["Roupas", "Loja teste"], ["Beleza", "Salão teste"], ["Materiais", "Ferragens teste"]]) {
    fireEvent.click(within(shortcuts).getByRole("button", { name: label }));
    expect(screen.getByText(name, { selector: "article p" })).toBeTruthy();
    expect(within(shortcuts).getByRole("button", { name: label }).getAttribute("aria-pressed")).toBe("true");
  }
});

it("restores a direct offline street-layer link without requesting the business catalog", () => {
  mapSearch.value = "?q=Avenida+Bras%C3%ADlia&camada=ruas";
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  render(<CityMap />);
  expect(screen.getByRole("button", { name: "Ruas e avenidas" }).getAttribute("aria-pressed")).toBe("true");
  expect((screen.getByRole("textbox", { name: "Buscar destino no mapa" }) as HTMLInputElement).value).toBe("Avenida Brasília");
  expect(catalogEnabled.values.every(value => value === false)).toBe(true);
  expect(screen.getByText(/Camada de ruas · sem carregar o catálogo/)).toBeTruthy();
  expect(screen.getAllByText("Avenida Brasília", { selector: "article p" }).length).toBeGreaterThan(0);
});

it("makes security and environment layers selectable and shareable without GPS", () => {
  mapSearch.value = "?camada=seguranca";
  render(<CityMap />);
  const categories = screen.getByRole("group", { name: "Categorias do mapa" });
  expect(within(categories).getByRole("button", { name: "Segurança" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(within(categories).getByRole("button", { name: "Meio ambiente" }));
  expect(within(categories).getByRole("button", { name: "Meio ambiente" }).getAttribute("aria-pressed")).toBe("true");
  expect(navigate).toHaveBeenCalledWith(expect.stringContaining("camada=meio-ambiente"), { replace: true });
  const url = new URL(String(navigate.mock.lastCall?.[0]), "https://example.org");
  expect(url.searchParams.has("lat")).toBe(false);
  expect(url.searchParams.has("lng")).toBe(false);
});

it("keeps a typed map search on the selected layer when the input loses focus", () => {
  render(<CityMap />);
  fireEvent.click(screen.getByRole("button", { name: "Saúde" }));
  const input = screen.getByRole("textbox", { name: "Buscar destino no mapa" });
  fireEvent.change(input, { target: { value: "UPA" } });
  fireEvent.blur(input);
  expect(navigate).toHaveBeenLastCalledWith(expect.stringContaining("q=UPA&camada=saude"), { replace: true });
});

it("keeps sourced environmental places in the list without inventing map coordinates", () => {
  mapSearch.value = "?camada=meio-ambiente";
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  render(<CityMap />);
  expect(screen.getByRole("button", { name: "Meio ambiente" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Parque Estadual Águas Lindas", { selector: "article p" })).toBeTruthy();
  expect(screen.getByText(/camada tem destinos sem coordenadas verificadas/i)).toBeTruthy();
  expect(screen.queryByText(/O mapa de ruas precisa de conexão/)).toBeNull();
});
