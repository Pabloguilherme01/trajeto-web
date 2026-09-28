import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OfficialDataRadar from "./OfficialDataRadar";

describe("OfficialDataRadar", () => {
  it("renders current official data categories and source links", () => {
    render(<OfficialDataRadar />);
    expect(screen.getByRole("heading", { name: /Radar ANP/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Preços de revenda/i }).getAttribute("href")).toContain("levantamento-de-precos");
    expect(screen.getByRole("link", { name: /Série histórica/i }).getAttribute("href")).toContain("serie-historica");
    expect(screen.getByRole("link", { name: /Qualidade · PMQC/i }).getAttribute("href")).toContain("pmqc");
    expect(screen.getByRole("link", { name: /Dados cadastrais/i }).getAttribute("href")).toContain("dados-cadastrais");
  });
});
