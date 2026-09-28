// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import OfficialSourcesCard from "./OfficialSourcesCard";

describe("OfficialSourcesCard", () => {
  afterEach(() => cleanup());

  it("exposes the official data shortcuts with external navigation", () => {
    render(<OfficialSourcesCard />);
    expect(screen.getByRole("heading", { name: /Central de dados para sua viagem/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Preços semanais da ANP/i }).getAttribute("href")).toContain("gov.br/anp");
    expect(screen.getByRole("link", { name: /Qualidade dos combustíveis/i }).getAttribute("href")).toContain("pmqc");
    expect(screen.getByRole("link", { name: /ANP com VC/i }).getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("link", { name: /Anuário Estatístico 2026/i }).getAttribute("href")).toContain("anuario-estatistico-2026");
    expect(screen.getByRole("link", { name: /CNH e CRLV digitais/i }).getAttribute("href")).toContain("gov.br/pt-br/servicos");
  });
});
