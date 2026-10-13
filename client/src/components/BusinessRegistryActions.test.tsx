import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BusinessRegistryActions from "./BusinessRegistryActions";

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
afterEach(() => {
  cleanup();
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

it("copies only the public CNPJ and keeps map access optional", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<BusinessRegistryActions cnpj="12.345.678/0001-90" mapUrl="/mapa?q=12345678000190&empresas=nome" />);
  fireEvent.click(screen.getByRole("button", { name: "Copiar CNPJ 12.345.678/0001-90" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("CNPJ copiado."));
  expect(writeText).toHaveBeenCalledWith("12.345.678/0001-90");
  expect(screen.getByRole("link", { name: "Ver empresa no mapa" }).getAttribute("href")).toContain("empresas=nome");
});

it("offers a manual copy fallback without adding a route for an unnamed record", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  render(<BusinessRegistryActions cnpj="12.345.678/0001-90" />);
  fireEvent.click(screen.getByRole("button", { name: "Copiar CNPJ 12.345.678/0001-90" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("copie o CNPJ manualmente"));
  expect(screen.queryByRole("link")).toBeNull();
});

it("explains that a named business cannot be routed without a verified point", () => {
  render(<BusinessRegistryActions cnpj="12345678000190" identified />);
  expect(screen.getByText(/Empresa identificada, mas sem ponto de chegada confirmado/)).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Ver empresa no mapa" })).toBeNull();
});
