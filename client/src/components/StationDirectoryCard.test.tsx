import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StationDirectoryCard } from "./StationDirectoryCard";

describe("ações do cartão de posto", () => {
  afterEach(cleanup);

  it("explica quando copiar não está disponível no navegador", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      value: class { observe() {} unobserve() {} disconnect() {} },
    });
    render(<StationDirectoryCard index={1} local={{
      id: "posto-teste", legalName: "Posto Teste LTDA", displayName: "Posto Teste", cnpj: "12345678000199",
      neighborhood: "Centro", address: "Avenida Brasil", brand: null, aliases: [], status: "cadastro_ativo", sourceNote: "Catálogo local",
    }} />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar CNPJ" }));
    expect((await screen.findByRole("status")).textContent).toContain("Não foi possível copiar");
  });
});
