import { describe, expect, it } from "vitest";
import { normalizeRouterTarget } from "./appUrl";

describe("routing in a hosted subdirectory", () => {
  it("removes only the duplicate base added by Wouter", () => {
    expect(normalizeRouterTarget("/trajeto-web/trajeto-web/planejar?destino=Hospital", "/trajeto-web")).toBe("/trajeto-web/planejar?destino=Hospital");
    expect(normalizeRouterTarget("/trajeto-web/trajeto-web/", "/trajeto-web")).toBe("/trajeto-web/");
  });
  it("preserves ordinary, root and unrelated destinations", () => {
    expect(normalizeRouterTarget("/trajeto-web/postos", "/trajeto-web")).toBe("/trajeto-web/postos");
    expect(normalizeRouterTarget("/planejar", "")).toBe("/planejar");
    expect(normalizeRouterTarget("/trajeto-web/trajeto-web-extra", "/trajeto-web")).toBe("/trajeto-web/trajeto-web-extra");
  });
});
