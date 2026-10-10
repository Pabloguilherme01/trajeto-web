import { expect, it } from "vitest";
import { loadBusinessCatalog } from "./businessCatalog";
import { searchBusinesses } from "./businessSearch";

it("opens the full imported food and shopping categories rather than only curated places", async () => {
  const items = await loadBusinessCatalog();
  const food = searchBusinesses(items, "alimentação");
  expect(food.length).toBeGreaterThan(100);
  expect(food.every(item => item.category === "alimentacao")).toBe(true);
  expect(searchBusinesses(items, "compras").length).toBeGreaterThan(1000);
  expect(searchBusinesses(items, "comer")).toEqual(food);
  const item = food[0];
  expect(searchBusinesses(items, item.business!.cnpj)).toEqual([item]);
  expect(searchBusinesses(items, "farmácias").length).toBeGreaterThan(0);
  expect(searchBusinesses(items, "oficinas").length).toBeGreaterThan(0);
  expect(searchBusinesses(items, "inexistente-xyz")).toEqual([]);
});
