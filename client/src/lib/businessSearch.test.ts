import { expect, it } from "vitest";
import { loadBusinessCatalog } from "./businessCatalog";
import { searchBusinesses } from "./businessSearch";

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
