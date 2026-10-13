import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { CityAtlasItem } from "@/lib/cityAtlas";

const requests = vi.hoisted(() => ({ enabled: [] as boolean[] }));
vi.mock("@/hooks/useBusinessCatalog", () => ({
  useBusinessCatalog: (enabled = false) => {
    requests.enabled.push(enabled);
    return { items: [], loading: false, error: false, retry: vi.fn() };
  },
}));
import PlannerLocationPicker, { plannerPickerItemsWithBusinesses } from "./PlannerLocationPicker";

afterEach(() => { cleanup(); requests.enabled = []; });

it("opens on bundled places without requesting the large commercial catalogue", () => {
  render(<PlannerLocationPicker kind="destino" value="" onChoose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher destino no catálogo local" }));
  const search = screen.getByRole("textbox", { name: "Buscar destino local" });
  expect(requests.enabled).not.toContain(true);
  fireEvent.change(search, { target: { value: "HEAL" } });
  expect(screen.getByRole("button", { name: /Selecionar HEAL/ })).toBeTruthy();
  expect(requests.enabled).not.toContain(true);
  fireEvent.click(screen.getByRole("button", { name: "Incluir empresas cadastradas" }));
  expect(requests.enabled.at(-1)).toBe(true);
});

it("loads imported CNPJ records after a specific unmatched location query", () => {
  render(<PlannerLocationPicker kind="origem" value="" onChoose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher origem no catálogo local" }));
  const search = screen.getByRole("textbox", { name: "Buscar origem local" });
  fireEvent.change(search, { target: { value: "42" } });
  expect(requests.enabled.at(-1)).toBe(false);
  fireEvent.change(search, { target: { value: "42.115.689/0001-40" } });
  expect(requests.enabled.at(-1)).toBe(true);
});

it("reuses catalog preparation across origin and destination and drops unnamed markers", () => {
  const items = [
    { id: "business-one", name: "Loja Clara", category: "compras", detail: "", sourceLabel: "", lat: -15.7, lng: -48.2,
      business: { cnpj: "12345678000190" } },
    { id: "business-two", name: "CNPJ 98.765.432/0001-10", category: "compras", detail: "", sourceLabel: "", lat: -15.71, lng: -48.21,
      business: { cnpj: "98765432000110" } },
    { id: "business-three", name: "Loja sem ponto", category: "compras", detail: "", sourceLabel: "" },
  ] as CityAtlasItem[];
  const prepared = plannerPickerItemsWithBusinesses(items);
  expect(plannerPickerItemsWithBusinesses(items)).toBe(prepared);
  expect(prepared.some(item => item.id === "business-one")).toBe(true);
  expect(prepared.some(item => item.id === "business-two")).toBe(false);
  expect(prepared.some(item => item.id === "business-three")).toBe(false);
});
