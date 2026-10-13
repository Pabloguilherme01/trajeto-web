import { expect, it } from "vitest";
import type { CityAtlasItem } from "./cityAtlas";
import { businessesForMapLayer, businessesForRegistryLayer, partitionBusinessCatalog } from "./businessSearch";

it("keeps addressless records in the CNPJ directory but never in map layers", () => {
  const items = [
    { id: "business-a", name: "Loja Aurora", category: "compras", destination: "Rua A" },
    { id: "business-b", name: "CNPJ 12345678000190", category: "compras", destination: "" },
    { id: "business-c", name: "Empresa Teste", category: "servicos" },
  ] as CityAtlasItem[];
  expect(businessesForMapLayer(items, "todos")).toHaveLength(1);
  expect(businessesForRegistryLayer(items, "todos")).toBe(items);
  expect(businessesForRegistryLayer(items, "compras").map(item => item.id)).toEqual(["business-a", "business-b"]);
  expect(businessesForRegistryLayer(items, "servicos").map(item => item.id)).toEqual(["business-c"]);
  expect(businessesForRegistryLayer(items, "compras")).toBe(businessesForRegistryLayer(items, "compras"));
  expect(partitionBusinessCatalog(businessesForRegistryLayer(items, "compras")).unnamed.map(item => item.id)).toEqual(["business-b"]);
});
