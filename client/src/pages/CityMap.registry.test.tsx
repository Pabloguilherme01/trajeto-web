import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CityMap from "./CityMap";

const navigate = vi.hoisted(() => vi.fn());
const catalog = vi.hoisted(() => ({ items: [] as any[], loading: false, error: false, retry: vi.fn() }));
const search = vi.hoisted(() => ({ value: "" }));
vi.mock("@/hooks/useBusinessCatalog", () => ({ useBusinessCatalog: () => catalog }));
vi.mock("wouter", () => ({
  useSearch: () => search.value,
  useLocation: () => ["/mapa", navigate],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
afterEach(() => {
  cleanup();
  catalog.items = [];
  search.value = "";
  navigate.mockClear();
});

it("lists named and unnamed companies with no address in the CNPJ directory, without a false map link", () => {
  catalog.items = [
    { id: "business-a", name: "Loja Aurora", category: "compras", address: "", destination: "",
      business: { cnpj: "12345678000190", legalName: "Loja Aurora", tradeName: "Loja Aurora", sector: "Comercio", cnae: "", size: "", opened: "", statusDate: "", mei: "", simples: "", nature: "" } },
    { id: "business-b", name: "CNPJ 98765432000110", category: "compras",
      business: { cnpj: "98765432000110", legalName: "", tradeName: "", sector: "Comercio", cnae: "", size: "", opened: "", statusDate: "", mei: "", simples: "", nature: "" } },
  ];
  search.value = "?empresas=cnpj";
  render(<CityMap />);
  expect(screen.getByText("Loja Aurora", { selector: "article p" })).toBeTruthy();
  expect(screen.getByText("CNPJ 98765432000110", { selector: "article p" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Ver empresa no mapa" })).toBeNull();
  expect(screen.getByText(/Empresa identificada, mas sem ponto de chegada confirmado/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Só registros sem nome" }));
  expect(screen.queryByText("Loja Aurora", { selector: "article p" })).toBeNull();
  expect(screen.getByText("CNPJ 98765432000110", { selector: "article p" })).toBeTruthy();
});

it("finds a CNPJ without an address through an exact public registry deep link", () => {
  catalog.items = [{ id: "business-a", name: "CNPJ 12345678000190", category: "servicos",
    business: { cnpj: "12345678000190", legalName: "", tradeName: "", sector: "Servicos", cnae: "", size: "", opened: "", statusDate: "", mei: "", simples: "", nature: "" } }];
  search.value = "?empresas=cnpj&q=12345678000190";
  render(<CityMap />);
  expect(screen.getByText("CNPJ 12345678000190", { selector: "article p" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Copiar CNPJ 12345678000190" })).toBeTruthy();
});
