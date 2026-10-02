import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchLocalPlaces } from "@/lib/localPlaces";

describe("Search local commerce shortcuts", () => {
  const source = readFileSync(new URL("./Search.tsx", import.meta.url), "utf8");

  it("keeps pharmacy and market shortcuts inside the Trajeto", () => {
    expect(source).toContain('label: "Farmácias"');
    expect(source).toContain('query: "farmácia"');
    expect(source).toContain('label: "Mercados"');
    expect(source).toContain('query: "mercado"');
    expect(source).toContain("Catálogo local · funciona offline");
  });

  it("has local results for both shortcuts", () => {
    expect(searchLocalPlaces("farmácia").length).toBeGreaterThan(0);
    expect(searchLocalPlaces("mercado").length).toBeGreaterThan(0);
  });
});
