import { describe, expect, it } from "vitest";
import { matchesCatalogText, normalizeCatalogText } from "./catalogSearch";

describe("catalog search", () => {
  it("normalizes accents, case and repeated whitespace", () => {
    expect(normalizeCatalogText("  Águas   LINDAS  ")).toBe("aguas lindas");
  });

  it("requires whole tokens for short and numeric identifiers", () => {
    expect(matchesCatalogText("BR 070", ["Abril", "(61) 3613-0701"])).toBe(false);
    expect(matchesCatalogText("BR 070", ["Atendimento na BR-070"])).toBe(true);
  });

  it("keeps ordinal identifiers searchable", () => {
    expect(matchesCatalogText("2ª Delegacia", ["2ª Delegacia de Polícia"])).toBe(true);
    expect(matchesCatalogText("2 delegacia", ["2ª Delegacia de Polícia"])).toBe(true);
  });

  it("keeps flexible substring matching for longer citizen terms", () => {
    expect(matchesCatalogText("farmacia", ["Farmácia Popular"])).toBe(true);
    expect(matchesCatalogText("regulariza", ["Regularização fundiária"])).toBe(true);
  });
});

 it("does not inspect catalog fields for an empty search", () => {
  const fields = new Proxy([], { get() { throw new Error("unnecessary indexing"); } });
  expect(matchesCatalogText("  ", fields)).toBe(true);
 });
