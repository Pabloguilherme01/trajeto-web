import { describe, expect, it } from "vitest";
import { resolveIntentQuery } from "./intentResolver";

describe("resolveIntentQuery", () => {
  it("detecta navegação por intenção", () => {
    expect(resolveIntentQuery("como chegar ao hospital")).toEqual({
      kind: "route",
      query: "como chegar ao hospital",
    });
  });

  it("prioriza pontos locais prontos offline", () => {
    expect(resolveIntentQuery("Vapt Vupt")).toEqual({
      kind: "offline",
      query: "Vapt Vupt",
    });
  });

  it("mantém busca comum no mapa", () => {
    expect(resolveIntentQuery("escola no Jardim Brasília")).toEqual({
      kind: "map",
      query: "escola no Jardim Brasília",
    });
  });
});
