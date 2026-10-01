import { describe, expect, it } from "vitest";
import { getUniversalSearchResults } from "./universalSearch";

describe("universal citizen search", () => {
  it.each([
    ["Receita Federal", "receita-federal-pav"],
    ["CPF", "receita-federal-pav"],
    ["CNPJ", "receita-federal-pav"],
    ["imposto de renda", "receita-federal-pav"],
    ["Defesa Civil", "defesa-civil"],
    ["alagamento", "defesa-civil"],
    ["enchente", "defesa-civil"],
    ["desabamento", "defesa-civil"],
    ["risco estrutural", "defesa-civil"],
  ])(
    "opens the intended service for %s without route-only duplicates",
    (query, id) => {
      const results = getUniversalSearchResults(query);
      expect(results.services.map(item => item.id)).toEqual([id]);
      expect(results.routes).toEqual([]);
      expect(results.places).toEqual([]);
    }
  );
  it("returns no fake matches for an empty or unknown search", () => {
    expect(getUniversalSearchResults(" ").total).toBe(0);
    expect(getUniversalSearchResults("servico-inexistente-xyz").total).toBe(0);
  });
  it("keeps the complete service count without repeating public route shortcuts", () => {
    const results = getUniversalSearchResults("ESF");
    expect(results.services.length).toBeGreaterThan(12);
    expect(results.routes).toEqual([]);
    const upa = getUniversalSearchResults("UPA");
    expect(upa.services.map(item => item.id)).toContain("upa-mansoes-odisseia");
    expect(upa.routes.some(item => item.id === "upa")).toBe(false);
  });
  it("keeps commerce and route-only references without duplicating a place", () => {
    const results = getUniversalSearchResults("Spoleto");
    expect(results.places.length).toBe(1);
    expect(results.routes).toEqual([]);
    expect(
      getUniversalSearchResults("Centro").routes.some(
        item => item.id === "centro"
      )
    ).toBe(true);
  });
  it("finds a citizen's need and a station without a backend", () => {
    expect(
      getUniversalSearchResults("segunda via da conta de agua").services.map(
        item => item.id
      )
    ).toEqual(["saneago"]);
    expect(
      getUniversalSearchResults("Rham").stations.some(
        item => item.id === "rham"
      )
    ).toBe(true);
    expect(
      getUniversalSearchResults("carteira de trabalho").services.map(
        item => item.id
      )
    ).toContain("carteira-trabalho-digital");
    expect(
      getUniversalSearchResults("cnis").services.map(item => item.id)
    ).toEqual(["meu-inss"]);
  });
});
