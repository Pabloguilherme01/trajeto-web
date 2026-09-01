import { describe, expect, it } from "vitest";
import { dashboardAccessCopy, personalAccessCopy } from "./dashboardAccessCopy";

describe("dashboard access copy", () => {
  it("descreve a área pessoal sem confundi-la com operações", () => {
    expect(personalAccessCopy.title).toBe("Entre para acessar sua conta");
    expect(personalAccessCopy.description).toContain("postos favoritos");
    expect(personalAccessCopy.description).not.toContain("painel operacional");
  });

  it("mantém a orientação específica para a área operacional", () => {
    expect(dashboardAccessCopy.description).toContain("painel operacional");
  });
});
