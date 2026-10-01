import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchPage from "./Search";
import { localDataEvent } from "@/lib/localData";

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  localStorage.clear();
  window.history.replaceState(null, "", "/buscar");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("mobile search organization", () => {
  it("starts with four essential shortcuts and expands secondary categories", () => {
    render(<SearchPage />);
    expect(
      screen.getByLabelText("Ações essenciais").querySelectorAll("button")
    ).toHaveLength(4);
    const more = screen.getByRole("button", {
      name: "Mais opções: postos, comércio e outras categorias",
    });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Educação" })).toBeNull();
    fireEvent.click(more);
    expect(screen.getByRole("button", { name: "Educação" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Menos opções" }));
    expect(screen.queryByRole("button", { name: "Educação" })).toBeNull();
  });
  it("puts services immediately after the search and removes empty or repeated sections", () => {
    window.history.replaceState(null, "", "/buscar?q=cras");
    render(<SearchPage />);
    expect(screen.getAllByRole("button", { name: /CRAS/ })).toHaveLength(3);
    expect(
      screen.queryByRole("heading", {
        name: /Postos|Lugares e comércio|Outros destinos|O que você precisa/,
      })
    ).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("3 resultado(s)");
  });
  it("shows an automatic local answer with direct actions for a citizen need", () => {
    window.history.replaceState(null, "", "/buscar?q=dengue");
    render(<SearchPage />);
    expect(screen.getByText(/Resposta rápida · Águas Lindas/i)).toBeTruthy();
    expect(screen.getAllByText("Vigilância em Saúde").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Ver detalhes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Planejar rota" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ligar" }).getAttribute("href")).toBe("tel:6136181409");
  });

  it("shows the source label for local places instead of presenting a category as a source", () => {
    window.history.replaceState(null, "", "/buscar?q=giraffas");
    render(<SearchPage />);
    expect(screen.getAllByText("Consulta local").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alimentação/).length).toBeGreaterThan(0);
  });

  it("offers recovery for an unknown query and disables external search offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    window.history.replaceState(null, "", "/buscar?q=nao-existe-xyz");
    const open = vi.spyOn(window, "open");
    render(<SearchPage />);
    expect(screen.getByText(/Nenhum resultado local/)).toBeTruthy();
    const external = screen.getByRole("button", {
      name: "Buscar no Google Maps · online",
    }) as HTMLButtonElement;
    expect(external.disabled).toBe(true);
    fireEvent.click(external);
    expect(open).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Abrir central de serviços" })
    ).toBeTruthy();
  });
  it("clears the query, returns to shortcuts and focuses the input", () => {
    window.history.replaceState(null, "", "/buscar?q=cras");
    render(<SearchPage />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(window.location.search).toBe("");
    expect(
      screen.getByRole("heading", { name: "O que você precisa?" })
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Buscar locais e serviços" })
    );
  });
  it("refreshes recent shortcuts when local data is cleared", () => {
    localStorage.setItem(
      "trajeto-recent-searches",
      JSON.stringify(["Teste antigo"])
    );
    render(<SearchPage />);
    expect(screen.getByRole("button", { name: "Teste antigo" })).toBeTruthy();
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new Event(localDataEvent));
    });
    expect(screen.queryByRole("button", { name: "Teste antigo" })).toBeNull();
  });
});
