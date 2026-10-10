import { describe, expect, it } from "vitest";
import { readPublicServiceListFilters, publicServiceListUrl } from "./publicServiceListFilters";

describe("public service list filter URLs", () => {
  it("round-trips the active search, category, saved and official-channel filters", () => {
    const url = publicServiceListUrl({
      query: "  ESF Setor 09  ",
      category: "saude",
      resource: "online",
      savedOnly: true,
    });
    const parsed = new URL(url, "https://trajeto.example");
    expect(parsed.pathname).toMatch(/\/servicos$/);
    expect(parsed.searchParams.toString()).toBe(
      "q=ESF+Setor+09&categoria=saude&salvos=1&recurso=online"
    );
    expect(readPublicServiceListFilters(parsed.searchParams)).toEqual({
      query: "ESF Setor 09",
      category: "saude",
      resource: "online",
      savedOnly: true,
    });
    expect(parsed.searchParams.has("lat")).toBe(false);
    expect(parsed.searchParams.has("lng")).toBe(false);
  });

  it("defaults invalid values without discarding a legitimate search", () => {
    expect(readPublicServiceListFilters(new URLSearchParams(
      "q=upa&categoria=desconhecida&recurso=desconhecido&salvos=0"
    ))).toEqual({ query: "upa", category: "todos", resource: "todos", savedOnly: false });
  });

  it("does not retain service deep links and omits empty/default query keys", () => {
    const old = readPublicServiceListFilters(new URLSearchParams("servico=upa-mansoes-odisseia"));
    expect(publicServiceListUrl(old)).toMatch(/\/servicos$/);
    const url = new URL(publicServiceListUrl({
      query: "  ",
      category: "todos",
      resource: "todos",
      savedOnly: false
    }), "https://trajeto.example");
    expect(url.search).toBe("");
  });

  it("keeps service categories with hyphenated IDs and valid resource filters", () => {
    const filters = readPublicServiceListFilters(new URLSearchParams(
      "categoria=ensino-superior&recurso=contato&salvos=1"
    ));
    expect(filters.category).toBe("ensino-superior");
    expect(filters.resource).toBe("contato");
    expect(filters.savedOnly).toBe(true);
    expect(publicServiceListUrl(filters)).toContain("categoria=ensino-superior");
  });
});
