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
    const href = screen.getByRole("link", { name: "Traçar rota" }).getAttribute("href")!;
    expect(new URL(href, "https://example.test").searchParams.get("destino")).toContain("Avenida Teste, 42");
    expect(href).not.toContain("0%2C0");
    expect(screen.getByRole("link", { name: "Ligar para o posto" }).getAttribute("href")).toBe("tel:61999990000");
    expect(screen.queryByText("WhatsApp")).toBeNull();
    expect(screen.queryByText("Instagram")).toBeNull();
    expect(screen.getByText("Todos os dados disponíveis").closest("details")?.open).toBe(false);
    expect(screen.getByText(/Preço individual indisponível/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Salvar/ })).toBeNull();
  });
  it("uses the preferred external provider and exposes a working save callback", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const save = vi.fn();
    setPreferredNavigationProvider("waze");
    render(<StationDirectoryCard index={1} local={local} onToggleSaved={save} />);
    fireEvent.click(screen.getByRole("button", { name: "Navegar" }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining("waze.com"), "_blank", "noopener,noreferrer");
    expect(new URL(String(open.mock.calls[0][0])).searchParams.get("q")).toContain("Avenida Teste");
    fireEvent.click(screen.getByRole("button", { name: "Salvar posto neste aparelho" }));
    expect(save).toHaveBeenCalledTimes(1);
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
