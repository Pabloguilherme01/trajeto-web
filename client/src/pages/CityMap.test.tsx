import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CityMap from "./CityMap";
import { DESTINATION_AREAS } from "@/lib/destinationAreas";
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
it("separates unnamed CNPJ records from the default map and its route actions", () => {
  catalog.items = [{ id: "business-12345678000190", name: "CNPJ 12.345.678/0001-90", category: "compras", detail: "Cadastro sem nome", destination: "Rua 1", sourceLabel: "Arquivo", lat: -15.7, lng: -48.2,
    business: { cnpj: "12.345.678/0001-90", legalName: "12345678000190", tradeName: "", sector: "Comércio", cnae: "", opened: "", statusDate: "", size: "", mei: "", simples: "", nature: "" } }];
  mapSearch.value = "?q=12.345.678/0001-90";
  render(<CityMap />);
  expect(screen.queryByText("CNPJ 12.345.678/0001-90", { exact: true })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Consultar CNPJ" }));
  expect(screen.getByText("CNPJ 12.345.678/0001-90", { exact: true })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Ir até aqui" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Planejar ponto confirmado" })).toBeNull();
  expect(screen.queryByText(/Coordenadas:/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Só registros sem nome" }));
  expect(String(navigate.mock.calls.at(-1)?.[0])).toContain("empresas=sem-nome");
});
it("returns to the public map when a company-only view switches to a non-company layer", () => {
  render(<CityMap />);
  fireEvent.click(screen.getByRole("button", { name: "Empresas com nome" }));
  fireEvent.click(within(screen.getByRole("group", { name: "Categorias do mapa" })).getByRole("button", { name: "Postos" }));
  expect(screen.getByRole("button", { name: "Mapa completo" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Posto Ponteio", { exact: true })).toBeTruthy();
});
it("opens the general map without loading businesses until an explicit intent", () => {
  render(<CityMap />);
  expect(catalogEnabled.values).not.toContain(true);
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino no mapa" }), { target: { value: "a" } });
  expect(catalogEnabled.values).not.toContain(true);
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar destino no mapa" }), { target: { value: "farmácia" } });
  expect(catalogEnabled.values.at(-1)).toBe(true);
});

it("keeps the complete company catalog reachable without typing a search", () => {
  render(<CityMap />);
  fireEvent.click(screen.getByRole("button", { name: "Explorar empresas" }));
  expect(catalogEnabled.values.at(-1)).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Limpar todos os filtros do mapa" }));
  expect(catalogEnabled.values.at(-1)).toBe(false);
});
it("explains the category, position and source of a map card", () => {
  mapSearch.value = "?q=CRAS";
  render(<CityMap />);
  const card = screen.getByRole("group", { name: "Referência de CRAS II · Santa Lúcia" });
  expect(within(card).getByText("Serviços", { exact: true })).toBeTruthy();
  expect(within(card).getByText("Endereço sem coordenadas", { exact: true })).toBeTruthy();
  expect(within(card).getByRole("link", { name: "Fonte de CRAS II · Santa Lúcia: Prefeitura de Águas Lindas" }).getAttribute("href")).toMatch(/^https:\/\//);
});

it("recovers results hidden by coordinates without clearing query, category or area", () => {
  const area = DESTINATION_AREAS.find(item => item.name === "Jardim Brasília")!.id;
  mapSearch.value = "?q=CRAS&camada=servicos&coordenadas=1&bairro=" + area;
  render(<CityMap />);
  expect(screen.queryByText("CRAS I", { exact: true })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Incluir destinos sem coordenadas" }));
  expect(screen.getByText("CRAS I", { exact: true })).toBeTruthy();
  expect((screen.getByRole("textbox", { name: "Buscar destino no mapa" }) as HTMLInputElement).value).toBe("CRAS");
  expect(screen.getByRole("button", { name: "Serviços" }).getAttribute("aria-pressed")).toBe("true");
  const params = new URL(String(navigate.mock.calls.at(-1)?.[0]), "https://example.test").searchParams;
  expect(params.get("q")).toBe("CRAS");
  expect(params.get("camada")).toBe("servicos");
  expect(params.get("bairro")).toBe(area);
  expect(params.has("coordenadas")).toBe(false);
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
  expect(screen.getByText(/Coordenadas: -15.73723, -48.28041/)).toBeTruthy();
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

it("reveals deep-linked mobile categories and keyboard focus without scrolling the document", () => {
  mapSearch.value = "?camada=meio-ambiente";
  const documentScroll = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  const originalScrollBy = HTMLElement.prototype.scrollBy;
  const railScroll = vi.fn();
  HTMLElement.prototype.scrollBy = railScroll;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const label = this.tagName === "BUTTON" ? this.textContent || "" : "";
    const left = label === "Meio ambiente" ? 480 : label === "Educação" ? 390 : 0;
    return { x: left, y: 0, left, top: 0, right: left + (left ? 140 : 320),
      bottom: 50, width: left ? 140 : 320, height: 50, toJSON() {} };
  });
  try {
    const view = render(<CityMap />);
    expect(railScroll).toHaveBeenCalledWith({ left: 308, behavior: "auto" });
    expect(documentScroll).not.toHaveBeenCalled();
    railScroll.mockClear();
    view.rerender(<CityMap />);
    expect(railScroll).not.toHaveBeenCalled();
    fireEvent.focus(within(screen.getByRole("group", { name: "Categorias do mapa" }))
      .getByRole("button", { name: "Educação" }));
    expect(railScroll).toHaveBeenCalledWith({ left: 218, behavior: "auto" });
    expect(documentScroll).not.toHaveBeenCalled();
  } finally {
    HTMLElement.prototype.scrollBy = originalScrollBy;
  }
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

it("skips ANP network loading when opening the streets map directly", () => {
  mapSearch.value = "?camada=ruas&q=Avenida+Bras%C3%ADlia";
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline test"));
  render(<CityMap />);
  expect(screen.getByRole("button", { name: "Ruas e avenidas" }).getAttribute("aria-pressed")).toBe("true");
  expect(network.mock.calls.some(([url]) => String(url).includes("aguas-lindas-anp.json"))).toBe(false);
  expect(screen.getAllByText("Avenida Brasília", { selector: "article p" }).length).toBeGreaterThan(0);
});

it("skips ANP in the security layer and loads it when fuel markers are requested", () => {
  mapSearch.value = "?camada=seguranca";
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline test"));
  render(<CityMap />);
  expect(network.mock.calls.some(([url]) => String(url).includes("aguas-lindas-anp.json"))).toBe(false);
  fireEvent.click(within(screen.getByRole("group", { name: "Categorias do mapa" })).getByRole("button", { name: "Postos" }));
  expect(network.mock.calls.some(([url]) => String(url).includes("aguas-lindas-anp.json"))).toBe(true);
});

it("does not load the 21k-company catalog for safety, fuel, city references or streets", () => {
  for (const layer of ["seguranca", "combustivel", "centro", "ruas"]) {
    cleanup();
    catalogEnabled.values = [];
    mapSearch.value = "?camada=" + layer;
    render(<CityMap />);
    expect(catalogEnabled.values).toContain(false);
    expect(catalogEnabled.values).not.toContain(true);
    expect(screen.getByText(/sem carregar o catálogo de empresas/i)).toBeTruthy();
  }
});

it("loads companies when switching from a local-only map layer to a business category", () => {
  mapSearch.value = "?camada=seguranca";
  render(<CityMap />);
  expect(catalogEnabled.values).not.toContain(true);
  fireEvent.click(within(screen.getByRole("group", { name: "Categorias do mapa" })).getByRole("button", { name: "Compras" }));
  expect(catalogEnabled.values.at(-1)).toBe(true);
});


it("keeps street-layer access next to All and brings the map before navigation preferences", () => {
  render(<CityMap />);
  const categories = within(screen.getByRole("group", { name: "Categorias do mapa" }));
  const choices = categories.getAllByRole("button");
  expect(choices[0].textContent).toBe("Tudo");
  expect(choices[1].textContent).toBe("Ruas e avenidas");
  const map = screen.getByRole("region", { name: "Mapa da cidade" });
  const provider = screen.getByRole("combobox", { name: "Aplicativo de mapa preferido" });
  expect(Boolean(map.compareDocumentPosition(provider) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  expect(screen.queryByRole("button", { name: /^Ver mapa$/ })).toBeNull();
  expect(screen.getByRole("button", { name: /^Ver resultados$/ })).toBeTruthy();
});

it("clears search, fast filters and active layer in one action without sharing private data", () => {
  mapSearch.value = "?q=UPA&camada=saude";
  render(<CityMap />);
  const groups = within(screen.getByRole("group", { name: "Categorias do mapa" }));
  const search = screen.getByRole("textbox", { name: "Buscar destino no mapa" }) as HTMLInputElement;
  expect(search.value).toBe("UPA");
  expect(groups.getByRole("button", { name: "Saúde" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Limpar todos os filtros do mapa" }));
  expect(search.value).toBe("");
  expect(groups.getByRole("button", { name: "Tudo" }).getAttribute("aria-pressed")).toBe("true");
  expect(navigate).toHaveBeenLastCalledWith(expect.stringMatching(/\/mapa$/), { replace: true });
  expect(String(navigate.mock.lastCall?.[0])).not.toMatch(/lat=|lng=|origem=/);
});

it("defers heavy offline-map warmup until browser idle and cancels on unmount", async () => {
  const previousServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
  const worker = {
    controller: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ready: Promise.resolve({}),
  };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: worker });
  let idleTask: (() => void) | undefined;
  const idle = vi.fn((task: () => void) => {
    idleTask = task;
    return 117;
  });
  const cancelIdle = vi.fn();
  vi.stubGlobal("requestIdleCallback", idle);
  vi.stubGlobal("cancelIdleCallback", cancelIdle);
  const requests = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline test"));
  try {
    const view = render(<CityMap />);
    expect(idle).toHaveBeenCalled();
    expect(requests.mock.calls.some(([input]) => String(input).includes("aguas-lindas-offline-map.json"))).toBe(false);
    await act(async () => { idleTask?.(); });
    expect(requests.mock.calls.some(([input]) => String(input).includes("aguas-lindas-offline-map.json"))).toBe(true);
    view.unmount();
  } finally {
    cleanup();
    vi.unstubAllGlobals();
    if (previousServiceWorker) Object.defineProperty(navigator, "serviceWorker", previousServiceWorker);
    else Reflect.deleteProperty(navigator, "serviceWorker");
  }
});

it("discards pending idle map warmup when the screen is closed", () => {
  const previousServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
    controller: {}, addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve({}),
  } });
  const idle = vi.fn(() => 123);
  const cancel = vi.fn();
  vi.stubGlobal("requestIdleCallback", idle);
  vi.stubGlobal("cancelIdleCallback", cancel);
  try {
    const view = render(<CityMap />);
    expect(idle).toHaveBeenCalled();
    view.unmount();
    expect(cancel).toHaveBeenCalledWith(123);
  } finally {
    cleanup();
    vi.unstubAllGlobals();
    if (previousServiceWorker) Object.defineProperty(navigator, "serviceWorker", previousServiceWorker);
    else Reflect.deleteProperty(navigator, "serviceWorker");
  }
});


it("offers direct recovery and edit actions when a map search finds nothing", () => {
  mapSearch.value = "?camada=seguranca&q=zzz-destino-inexistente-123";
  render(<CityMap />);
  expect(screen.getByText("Nenhum destino encontrado. Tente outro nome ou categoria.")).toBeTruthy();
  const search = screen.getByRole("textbox", { name: "Buscar destino no mapa" }) as HTMLInputElement;
  fireEvent.click(screen.getByRole("button", { name: "Ver todos os destinos" }));
  expect(search.value).toBe("");
  const categories = within(screen.getByRole("group", { name: "Categorias do mapa" }));
  expect(categories.getByRole("button", { name: "Tudo" }).getAttribute("aria-pressed")).toBe("true");
  expect(navigate).toHaveBeenLastCalledWith(expect.stringMatching(/\/mapa$/), { replace: true });
  expect(String(navigate.mock.lastCall?.[0])).not.toMatch(/lat=|lng=|origem=/);
});

it("focuses the editable search field from the no-results guidance", () => {
  mapSearch.value = "?camada=seguranca&q=zzz-destino-inexistente-123";
  render(<CityMap />);
  const search = screen.getByRole("textbox", { name: "Buscar destino no mapa" });
  const original = search.scrollIntoView;
  search.scrollIntoView = vi.fn();
  try {
    fireEvent.click(screen.getByRole("button", { name: "Corrigir busca" }));
    expect(document.activeElement).toBe(search);
    expect(search.scrollIntoView).toHaveBeenCalled();
  } finally {
    search.scrollIntoView = original;
  }
});

it("toggles an active quick filter off while keeping its map layer selected", () => {
  render(<CityMap />);
  const shortcuts = within(screen.getByRole("group", { name: "Filtros rápidos do mapa" }));
  const categories = within(screen.getByRole("group", { name: "Categorias do mapa" }));
  const input = screen.getByRole("textbox", { name: "Buscar destino no mapa" }) as HTMLInputElement;

  fireEvent.click(shortcuts.getByRole("button", { name: "Postos" }));
  expect(input.value).toBe("posto");
  expect(shortcuts.getByRole("button", { name: "Postos" }).getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(shortcuts.getByRole("button", { name: "Postos" }));
  expect(input.value).toBe("");
  expect(shortcuts.getByRole("button", { name: "Postos" }).getAttribute("aria-pressed")).toBe("false");
  expect(categories.getByRole("button", { name: "Postos" }).getAttribute("aria-pressed")).toBe("true");
  expect(navigate).toHaveBeenLastCalledWith(expect.stringContaining("camada=combustivel"), { replace: true });
  const url = String(navigate.mock.lastCall?.[0]);
  expect(url).not.toContain("q=");
  expect(url).not.toMatch(/lat=|lng=|origem=/);
});



it("separates unpositioned company records and restores the missing-location deep link", () => {
  catalog.items = [
    { id: "business-with-point", name: "Empresa teste com posição", category: "compras", detail: "Loja", destination: "Empresa teste com posição", sourceLabel: "Arquivo", lat: -15.77, lng: -48.28 },
    { id: "business-no-point", name: "Empresa teste sem posição", category: "compras", detail: "Loja", destination: "Empresa teste sem posição", sourceLabel: "Arquivo" },
  ];
  mapSearch.value = "?camada=compras&q=Empresa+teste&coordenadas=0";
  render(<CityMap />);
  const modes = within(screen.getByRole("group", { name: "Recursos dos destinos" }));
  expect(modes.getByRole("button", { name: "Sem coordenadas" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Empresa teste sem posição", { selector: "article p" })).toBeTruthy();
  expect(screen.queryByText("Empresa teste com posição", { selector: "article p" })).toBeNull();
  expect(screen.getByText(/não geram marcadores ou rotas locais garantidas/)).toBeTruthy();
  fireEvent.click(modes.getByRole("button", { name: "Com coordenadas" }));
  expect(screen.getByText("Empresa teste com posição", { selector: "article p" })).toBeTruthy();
  expect(screen.queryByText("Empresa teste sem posição", { selector: "article p" })).toBeNull();
  expect(navigate).toHaveBeenLastCalledWith(expect.stringContaining("coordenadas=1"), { replace: true });
  fireEvent.click(screen.getByRole("button", { name: "Limpar todos os filtros do mapa" }));
  expect(navigate).toHaveBeenLastCalledWith(expect.stringMatching(/\/mapa$/), { replace: true });
});

it("restores municipal bairro filtering from public URL without assigning artificial map points", () => {
  mapSearch.value = "?camada=servicos&bairro=bairro-jardim-brasilia";
  render(<CityMap />);
  const area = screen.getByRole("combobox", { name: "Filtrar destinos por bairro ou setor" }) as HTMLSelectElement;
  expect(area.value).toBe("bairro-jardim-brasilia");
  expect(screen.getByText(/Atlas municipal: versão declarada em 2026-10-02/)).toBeTruthy();
  fireEvent.change(area, { target: { value: "bairro-jardim-querencia" } });
  const url = new URL(String(navigate.mock.lastCall?.[0]), "https://example.org");
  expect(url.searchParams.get("bairro")).toBe("bairro-jardim-querencia");
  expect(url.searchParams.get("camada")).toBe("servicos");
  expect(url.searchParams.has("lat")).toBe(false);
  expect(url.searchParams.has("lng")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Limpar todos os filtros do mapa" }));
  expect(area.value).toBe("");
  expect(navigate).toHaveBeenLastCalledWith(expect.stringMatching(new RegExp("/mapa$")), { replace: true });
});

it("opens a sourced bairros-only layer without businesses, ANP, GPS or invented points", () => {
  mapSearch.value = "?camada=bairros";
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline network"));
  render(<CityMap />);
  const categories = within(screen.getByRole("group", { name: "Categorias do mapa" }));
  expect(categories.getByRole("button", { name: "Bairros e setores" }).getAttribute("aria-pressed")).toBe("true");
  expect(catalogEnabled.values.every(flag => flag === false)).toBe(true);
  expect(network.mock.calls.some(([url]) => String(url).includes("aguas-lindas-anp.json"))).toBe(false);
  expect(screen.getByText("Jardim Brasília", { selector: "article p" })).toBeTruthy();
  expect(screen.getByText(/não há ponto de chegada, quadra ou entrada/i)).toBeTruthy();
  expect(screen.getAllByRole("link", { name: "Usar nome como referência no planejador" }).length).toBeGreaterThan(0);
  const url = new URL(String(screen.getAllByRole("link", { name: "Usar nome como referência no planejador" })[0].getAttribute("href")), "https://example.org");
  expect(url.searchParams.has("lat")).toBe(false);
  expect(url.searchParams.has("lng")).toBe(false);
  fireEvent.click(categories.getByRole("button", { name: "Ruas e avenidas" }));
  expect(navigate).toHaveBeenLastCalledWith(expect.stringContaining("camada=ruas"), { replace: true });
});
