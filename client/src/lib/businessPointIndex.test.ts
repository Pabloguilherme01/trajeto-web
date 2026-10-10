import { expect, it } from "vitest";
import type { CityAtlasItem } from "./cityAtlas";
import { resolveBusinessPointFromCatalog } from "./businessPointIndex";

function company(cnpj: string, name: string, lat?: number, lng?: number): CityAtlasItem {
  return {
    id: "business-" + cnpj.replace(/\D/g, ""),
    name,
    category: "compras",
    detail: "Catalogado",
    address: "Rua das Flores, Águas Lindas de Goiás",
    sourceLabel: "Catálogo de teste",
    lat,
    lng,
    business: {
      cnpj, legalName: name, tradeName: name, sector: "Comércio",
      cnae: "", opened: "", statusDate: "", size: "", mei: "", simples: "", nature: "",
    },
  };
}

it("resolves formatted and numeric CNPJ repeatedly without changing the catalog", () => {
  const record = company("12.345.678/0001-90", "Loja São José", -15.7, -48.2);
  const items = [record];
  expect(resolveBusinessPointFromCatalog(items, "12.345.678/0001-90")).toEqual({ lat: -15.7, lng: -48.2 });
  expect(resolveBusinessPointFromCatalog(items, "12345678000190")).toEqual({ lat: -15.7, lng: -48.2 });
  expect(resolveBusinessPointFromCatalog(items, "Loja Sao Jose")).toEqual({ lat: -15.7, lng: -48.2 });
  expect(resolveBusinessPointFromCatalog(items, "Loja São José")).toEqual({ lat: -15.7, lng: -48.2 });
  expect(items).toEqual([record]);
});

it("does not convert shared names, addresses or records without coordinates into points", () => {
  const items = [
    company("12.345.678/0001-90", "Mercado Central", -15.7, -48.2),
    company("98.765.432/0001-10", "Mercado Central", -15.8, -48.3),
    company("11.111.111/0001-11", "Sem localização"),
  ];
  expect(resolveBusinessPointFromCatalog(items, "Mercado Central")).toBeNull();
  expect(resolveBusinessPointFromCatalog(items, "Rua das Flores, Águas Lindas de Goiás")).toBeNull();
  expect(resolveBusinessPointFromCatalog(items, "Sem localização")).toBeNull();
  expect(resolveBusinessPointFromCatalog(items, "11.111.111/0001-11")).toBeNull();
  expect(resolveBusinessPointFromCatalog(items, "98.765.432/0001-10")).toEqual({ lat: -15.8, lng: -48.3 });
});

it("rejects conflicting identities while retaining separate per-catalog indexes", () => {
  const first = company("12.345.678/0001-90", "Loja 12345678000190", -15.7, -48.2);
  const second = company("98.765.432/0001-10", "Loja 12345678000190", -15.8, -48.3);
  expect(resolveBusinessPointFromCatalog([first, second], "Loja 12345678000190")).toBeNull();
  const onlyFirst = [first];
  expect(resolveBusinessPointFromCatalog(onlyFirst, "Loja 12345678000190")).toEqual({ lat: -15.7, lng: -48.2 });
  expect(resolveBusinessPointFromCatalog([second], "12.345.678/0001-90")).toBeNull();
});

it("does not resolve duplicate CNPJ entries even when each has a valid point", () => {
  const items = [
    company("12.345.678/0001-90", "Empresa A", -15.7, -48.2),
    company("12.345.678/0001-90", "Empresa B", -15.8, -48.3),
  ];
  expect(resolveBusinessPointFromCatalog(items, "12345678000190")).toBeNull();
  expect(resolveBusinessPointFromCatalog(items, "Empresa A")).toEqual({ lat: -15.7, lng: -48.2 });
});
