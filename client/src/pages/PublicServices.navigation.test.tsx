import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PublicServices from "./PublicServices";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("React", React);
  Element.prototype.scrollIntoView = vi.fn();
});
it("recovers a search hidden by category without losing the term", async () => {
  window.history.replaceState({}, "", "/servicos?q=anatel&categoria=saude");
  render(<PublicServices />);
  fireEvent.click(screen.getByRole("button", { name: "Buscar este termo em todo o catálogo" }));
  await waitFor(() => expect(window.location.search).toBe("?q=anatel"));
  expect(document.querySelectorAll("#service-results article").length).toBeGreaterThan(0);
});

it("restores ready routes after an empty search", () => {
  window.history.replaceState({}, "", "/servicos");
  render(<PublicServices />);
  const input = screen.getByRole("searchbox", { name: "Buscar rota pronta" });
  fireEvent.change(input, { target: { value: "zzzzzzzzzz" } });
  fireEvent.click(screen.getByRole("button", { name: "Ver todas as rotas prontas" }));
  expect((input as HTMLInputElement).value).toBe("");
  expect(screen.getAllByRole("button", { name: /Planejar rota para/ }).length).toBeGreaterThan(0);
}, 15000);
it("keeps the current resource filter when Escape clears the search", async () => {
  window.history.replaceState({}, "", "/servicos?q=anatel");
  render(<PublicServices />);
  fireEvent.click(screen.getByRole("button", { name: "Resolver online" }));
  await waitFor(() => expect(window.location.search).toContain("recurso=online"));
  const input = screen.getByRole("textbox", { name: "Buscar serviços públicos" });
  input.focus();
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(window.location.search).toBe("?recurso=online"));
});

it("focuses all services after leaving an individual service", async () => {
  window.history.replaceState({}, "", "/servicos?servico=upa-mansoes-odisseia");
  render(<PublicServices />);
  fireEvent.click(screen.getByRole("button", { name: /Ver todos os .* serviços oficiais/ }));
  await waitFor(() => expect(window.location.search).toBe(""));
  await waitFor(() => expect(document.activeElement?.id).toBe("service-results"));
  expect(document.querySelectorAll("#service-results article").length).toBeGreaterThan(1);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

it.each([
  ["Rotas prontas", false],
  ["Usar offline", true],
])("opens %s from filtered services and focuses the destination section", async (label, offlineOnly) => {
  window.history.replaceState({}, "", "/servicos?q=anatel&categoria=telecom&recurso=online");
  render(<PublicServices />);
  expect(screen.queryByRole("heading", { name: "Rotas prontas para o dia a dia" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: label }));
  await waitFor(() => expect(window.location.search).toBe(""));
  await waitFor(() => expect(document.activeElement?.id).toBe("ready-routes"));
  expect(screen.getByRole("button", { name: /Mostrar somente destinos offline/ }).getAttribute("aria-pressed")).toBe(String(offlineOnly));
  expect((screen.getByRole("searchbox", { name: "Buscar rota pronta" }) as HTMLInputElement).value).toBe("");
}, 15000);

it("shows the new official higher education services in their category", () => {
  window.history.replaceState({}, "", "/servicos?categoria=ensino-superior");
  render(<PublicServices />);
  expect(screen.getByRole("heading", { name: "Sisu · vagas em universidades públicas" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Prouni · bolsas em faculdades particulares" })).toBeTruthy();
  expect(document.querySelectorAll("#service-results article")).toHaveLength(2);
});


it("searches ready routes by the public service need locally", () => {
  window.history.replaceState({}, "", "/servicos");
  render(<PublicServices />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar rota pronta" }), { target: { value: "baixar empresa" } });
  expect(screen.getByRole("button", { name: /Planejar rota para Sala do Empreendedor/ })).toBeTruthy();
}, 15000);

it("offers Organic Maps transport modes after selecting a physical service", () => {
  window.history.replaceState({}, "", "/servicos?servico=upa-mansoes-odisseia");
  render(<PublicServices />);
  const mode = screen.getByRole("combobox", { name: "Modo de navegação no Organic Maps" });
  fireEvent.change(mode, { target: { value: "walk" } });
  expect((mode as HTMLSelectElement).value).toBe("walk");
  expect(screen.getByRole("button", { name: /Abrir .* no Organic Maps/ }).textContent).toContain("a pé");
});

it("finds both official course catalogs without assigning a local route", () => {
  window.history.replaceState({}, "", "/servicos?categoria=capacitacao&q=cursos%20gratuitos");
  render(<PublicServices />);
  expect(document.querySelectorAll("#service-results article")).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "Planejar rota" })).toBeNull();
  expect(screen.getAllByText("ficha disponível offline")).toHaveLength(2);
});
