import { expect, it, vi } from "vitest";
import { loadBusinessCatalog } from "./businessCatalog";
import { businessesForMapLayer, businessesForMapLayerByIdentity, searchBusinesses, partitionBusinessCatalog } from "./businessSearch";

it("does not match UPA inside clothing names while retaining real acronyms and longer searches", () => {
  const items = [
    { id: "clothing", name: "Loja de roupas", category: "compras" },
    { id: "health", name: "UPA Atendimento", category: "saude" },
    { id: "school", name: "Escola Municipal", category: "educacao" },
  ] as import("./cityAtlas").CityAtlasItem[];
  expect(searchBusinesses(items, "UPA").map(item => item.id)).toEqual(["health"]);
  expect(searchBusinesses(items, "upa atendimento").map(item => item.id)).toEqual(["health"]);
  expect(searchBusinesses(items, "UP")).toEqual([]);
  expect(searchBusinesses(items, "escol").map(item => item.id)).toEqual(["school"]);
  // A short exact token becoming a longer substring must restore candidates.
  expect(searchBusinesses(items, "upa" )).toHaveLength(1);
  expect(searchBusinesses(items, "roup" ).map(item => item.id)).toEqual(["clothing"]);
});

it("partitions identity results once without removing searchable CNPJ records", async () => {
  const items = await loadBusinessCatalog();
  const groups = partitionBusinessCatalog(items);
  expect(groups.named.length + groups.unnamed.length).toBe(items.length);
  expect(partitionBusinessCatalog(items)).toBe(groups);
  expect(searchBusinesses(items, "42.115.689/0001-40")).toHaveLength(1);
  expect(groups.named.find(item => item.business?.cnpj === "42.115.689/0001-40")?.name).toBe("AMAG");
});

it("reuses identity-safe category slices without showing CNPJ-only entries as named map destinations", () => {
  const items = [
    { id: "business-1", name: "Farmácia Aurora", category: "saude", destination: "Rua A", lat: -15.7, lng: -48.2 },
    { id: "business-2", name: "CNPJ 12.345.678/0001-90", category: "saude", destination: "Rua B", lat: -15.7, lng: -48.2 },
    { id: "business-3", name: "Mercado Central", category: "compras", destination: "Rua C" },
    { id: "business-4", name: "CNPJ 98.765.432/0001-10", category: "compras", destination: "Rua D" },
  ] as import("./cityAtlas").CityAtlasItem[];
  const named = businessesForMapLayerByIdentity(items, "todos", "named");
  const unnamed = businessesForMapLayerByIdentity(items, "todos", "unnamed");
  expect(named.map(item => item.id)).toEqual(["business-1", "business-3"]);
  expect(unnamed.map(item => item.id)).toEqual(["business-2", "business-4"]);
  expect(businessesForMapLayerByIdentity(items, "todos", "named")).toBe(named);
  expect(businessesForMapLayerByIdentity(items, "todos", "unnamed")).toBe(unnamed);
  expect(businessesForMapLayerByIdentity(items, "saude", "named").map(item => item.id)).toEqual(["business-1"]);
  expect(businessesForMapLayerByIdentity(items, "saude", "unnamed").map(item => item.id)).toEqual(["business-2"]);
  expect(businessesForMapLayer(items, "todos")).toHaveLength(4);
});

it("opens the full imported food and shopping categories rather than only curated places", async () => {
  const items = await loadBusinessCatalog();
  const food = searchBusinesses(items, "alimentação");
  expect(food.length).toBeGreaterThan(100);
  expect(food.every(item => item.category === "alimentacao")).toBe(true);
  expect(food[0].name).toBe(food[0].business!.tradeName);
  expect(items.every(item => /\p{L}/u.test(item.name))).toBe(true);
  expect(items.find(item => item.business?.cnpj === "00.921.427/0010-13")?.name).toBe("VEGA EMPRESA DE SERVICOS GERAIS LTDA");
  expect(searchBusinesses(items, "compras").length).toBeGreaterThan(1000);
  expect(searchBusinesses(items, "comer")).toEqual(food);
  const item = food[0];
  expect(searchBusinesses(items, item.business!.cnpj)).toEqual([item]);
  expect(searchBusinesses(items, "farmácias").length).toBeGreaterThan(0);
  expect(searchBusinesses(items, "oficinas").length).toBeGreaterThan(0);
  expect(searchBusinesses(items, "inexistente-xyz")).toEqual([]);
});


it("reuses bounded alias results and keeps identities isolated across catalogs", async () => {
  const items = await loadBusinessCatalog();
  const markets = searchBusinesses(items, "mercados");
  expect(markets.length).toBeGreaterThan(0);
  expect(searchBusinesses(items, "mercado")).toBe(markets);
  expect(new Set(markets.map(item => item.id)).size).toBe(markets.length);
  expect(searchBusinesses([], "mercados")).toEqual([]);
  for (const filter of ["roupas", "beleza", "materiais"]) {
    expect(searchBusinesses(items, filter).length).toBeGreaterThan(0);
  }
  const company = items[0];
  const digits = company.business!.cnpj.replace(/\D/g, "");
  expect(searchBusinesses(items, digits)).toEqual([company]);
  expect(searchBusinesses(items, company.business!.cnpj.replace(/[./-]/g, " "))).toEqual([company]);
});


it("matches a CNPJ by identity rather than another company's descriptive text", async () => {
  const items = await loadBusinessCatalog();
  const company = items[0];
  const digits = company.business!.cnpj.replace(/\D/g, "");
  const unrelated = { ...items[1], name: "Referência " + digits, keywords: [digits] };
  expect(searchBusinesses([unrelated, company], digits)).toEqual([company]);
  expect(searchBusinesses([unrelated], digits)).toEqual([]);
});

it("reuses stable map category lists without changing order or excluding distinct businesses sharing a point", () => {
  const items = [
    { id: "business-1", name: "A", category: "compras", destination: "A", lat: -15.7, lng: -48.2 },
    { id: "business-2", name: "B", category: "servicos", destination: "B", lat: -15.7, lng: -48.2 },
    { id: "business-3", name: "C", category: "compras", destination: "C", lat: -15.7, lng: -48.2 },
    { id: "business-4", name: "Sem local", category: "compras", destination: "" },
  ] as import("./cityAtlas").CityAtlasItem[];
  const all = businessesForMapLayer(items, "todos");
  const shops = businessesForMapLayer(items, "compras");
  expect(all.map(item => item.id)).toEqual(["business-1", "business-2", "business-3"]);
  expect(shops.map(item => item.id)).toEqual(["business-1", "business-3"]);
  expect(businessesForMapLayer(items, "compras")).toBe(shops);
  expect(businessesForMapLayer(items, "todos")).toBe(all);
  expect(businessesForMapLayer(items, "saude")).toEqual([]);
  expect(items).toHaveLength(4); // The original catalog is never modified.
  const validItems = items.slice(0, 3);
  expect(businessesForMapLayer(validItems, "todos")).toBe(validItems); // No needless full copy.
});

it("ranks only requested business categories while preserving previous stable order", async () => {
  const items = await loadBusinessCatalog();
  const hasTradeName = (value: string) => /\p{L}/u.test(value);
  for (const category of ["saude", "educacao", "alimentacao", "compras", "servicos", "transporte"] as const) {
    const expected = items.filter(item => item.category === category)
      .sort((a, b) => Number(hasTradeName(b.business?.tradeName ?? ""))
        - Number(hasTradeName(a.business?.tradeName ?? "")))
      .map(item => item.id);
    const first = searchBusinesses(items, category);
    expect(first.map(item => item.id)).toEqual(expected);
    expect(searchBusinesses(items, category)).toBe(first);
  }
  // Cached map layer grouping must still preserve file order, irrespective of
  // the separate ranking used by named-category search.
  const raw = items.filter(item => item.category === "compras" && Boolean(item.destination ?? item.address));
  expect(businessesForMapLayer(items, "compras").map(item => item.id))
    .toEqual(raw.map(item => item.id));
});

it("accepts a labeled CNPJ without matching unrelated descriptive text", () => {
  const company = { id: "business-1", name: "Mercado Aurora", category: "compras", business: { cnpj: "12.345.678/0001-90" } } as import("./cityAtlas").CityAtlasItem;
  const unrelated = { ...company, id: "business-2", name: "CNPJ 12345678000190", business: { ...company.business!, cnpj: "98.765.432/0001-10" } };
  expect(searchBusinesses([unrelated, company], "CNPJ: 12.345.678/0001-90")).toEqual([company]);
});


it("reuses prepared record text instead of normalizing it again for short identifiers", () => {
  const items = Array.from({ length: 200 }, (_, i) => ({
    id: "record-" + i, name: "Marcador Loja " + i, category: "compras", address: "Águas Lindas GO",
  })) as import("./cityAtlas").CityAtlasItem[];
  searchBusinesses(items, "marcador");
  const normalization = vi.spyOn(String.prototype, "normalize");
  try {
    expect(searchBusinesses(items, "go")).toHaveLength(200);
    expect(searchBusinesses(items, "loja go")).toHaveLength(200);
    const recordNormalizations = normalization.mock.contexts.filter(value => String(value).includes("marcador"));
    expect(recordNormalizations).toHaveLength(0);
  } finally {
    normalization.mockRestore();
  }
});

it("keeps short identifiers equivalent to catalog token matching across punctuation and accents", () => {
  const items = [
    { id: "real", name: "UPA GO", category: "saude", address: "Área 070" },
    { id: "clothes", name: "Roupas e artigos", category: "compras", address: "Código 0701" },
    { id: "ordinal", name: "Área 2ª", category: "servicos", address: "BR-070 GO" },
  ] as import("./cityAtlas").CityAtlasItem[];
  expect(searchBusinesses(items, "upa").map(item => item.id)).toEqual(["real"]);
  expect(searchBusinesses(items, "go").map(item => item.id)).toEqual(["real", "ordinal"]);
  expect(searchBusinesses(items, "070").map(item => item.id)).toEqual(["real", "ordinal"]);
  expect(searchBusinesses(items, "2").map(item => item.id)).toEqual(["ordinal"]);
  expect(searchBusinesses(items, "g.")).toEqual([]);
  expect(searchBusinesses(items, "árEa 070").map(item => item.id)).toEqual(["real", "ordinal"]);
});
