import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PublicServices from "./PublicServices";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("React", React);
  Element.prototype.scrollIntoView = vi.fn();
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
