import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VehicleServiceHub from "./VehicleServiceHub";

describe("VehicleServiceHub", () => {
  it("exposes official vehicle services without collecting credentials", () => {
    render(<VehicleServiceHub />);
    expect(screen.getByRole("heading", { name: /Documentos e serviços/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /CNH do Brasil/i }).getAttribute("href")).toContain("obter-carteira-digital-de-transito");
    expect(screen.getByRole("link", { name: /CRLV digital/i }).getAttribute("href")).toContain("crlv-e");
    expect(screen.getByText(/não pede senha gov.br/i)).toBeTruthy();
  });
});
