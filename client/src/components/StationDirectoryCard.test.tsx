/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StationDirectoryCard } from "./StationDirectoryCard";
import type { LocalStationRecord } from "@/lib/aguasLindasStations";
import { setPreferredNavigationProvider } from "@/lib/mobileTools";

const local: LocalStationRecord = { id: "fixture", displayName: "Posto Teste", legalName: "Posto Teste", cnpj: "12345678000190", address: "Avenida Teste, 42", neighborhood: "Centro", brand: null, aliases: [], status: "cadastro_ativo", sourceNote: "Teste", mapData: { phone: "(61) 99999-0000", hours: "24h" } };
beforeEach(() => { localStorage.clear(); vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("StationDirectoryCard practical actions", () => {
  it("routes by address without inventing coordinates or WhatsApp and keeps technical data collapsed", () => {
    render(<StationDirectoryCard index={1} local={local} />);
    const href = screen.getByRole("link", { name: "Ir até aqui" }).getAttribute("href")!;
    expect(new URL(href, "https://example.test").searchParams.get("destino")).toContain("Avenida Teste, 42");
    expect(href).not.toContain("0%2C0");
    expect(screen.getByRole("link", { name: "Ligar para o posto" }).getAttribute("href")).toBe("tel:61999990000");
    expect(screen.queryByText("WhatsApp")).toBeNull();
    expect(screen.queryByText("Instagram")).toBeNull();
    expect(screen.getByText("Sobre os dados deste posto").closest("details")?.open).toBe(false);
    expect(screen.getByText(/Preço individual indisponível/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Salvar/ })).toBeNull();
    expect(screen.getByText("Não conciliado")).toBeTruthy();
  });

  it("uses a normal external navigation link for the preferred provider and exposes save", () => {
    const save = vi.fn();
    setPreferredNavigationProvider("waze");
    render(<StationDirectoryCard index={1} local={local} onToggleSaved={save} />);
    const navigate = screen.getByRole("link", { name: "Abrir no Waze" });
    expect(navigate.getAttribute("target")).toBe("_blank");
    expect(navigate.getAttribute("rel")).toContain("noopener");
    expect(navigate.getAttribute("href")).toContain("waze.com");
    expect(new URL(navigate.getAttribute("href")!).searchParams.get("q")).toContain("Avenida Teste");
    fireEvent.click(screen.getByRole("button", { name: "Salvar posto neste aparelho" }));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("rejects zero coordinates for routing and does not display an invented distance", () => {
    render(<StationDirectoryCard index={1} local={{ ...local, anp: { latitude: 0, longitude: 0 } } as LocalStationRecord} />);
    const href = screen.getByRole("link", { name: "Ir até aqui" }).getAttribute("href")!;
    expect(new URL(href, "https://example.test").searchParams.get("destino")).toContain("Avenida Teste");
    expect(screen.queryByText(/^[\d,.]+ km$/)).toBeNull();
  });

  it("labels generic web search as research instead of a verified contact", () => {
    render(<StationDirectoryCard index={1} local={local} />);
    fireEvent.click(screen.getByText("Mais opções do posto"));
    expect(screen.getByRole("link", { name: "Pesquisar este posto na web" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Buscar contato na web" })).toBeNull();
  });

  it("reports clipboard failure without announcing that a CNPJ was copied", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<StationDirectoryCard index={1} local={local} />);
    fireEvent.click(screen.getByText("Mais opções do posto"));
    fireEvent.click(screen.getByRole("button", { name: "Copiar CNPJ" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Não foi possível copiar"));
    expect(screen.queryByText("Copiado")).toBeNull();
  });
});
