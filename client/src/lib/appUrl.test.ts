import { describe, expect, it } from "vitest";
import { normalizeRouterTarget } from "./appUrl";

describe("normalizeRouterTarget", () => {
  it("remove somente a base duplicada do hosting", () => {
    expect(normalizeRouterTarget("/trajeto-web/trajeto-web/planejar?destino=Hospital", "/trajeto-web"))
      .toBe("/trajeto-web/planejar?destino=Hospital");
    expect(normalizeRouterTarget("/trajeto-web/trajeto-web/", "/trajeto-web"))
      .toBe("/trajeto-web/");
  });

  it("preserva destinos normais e caminhos parecidos", () => {
    expect(normalizeRouterTarget("/trajeto-web/postos", "/trajeto-web"))
      .toBe("/trajeto-web/postos");
    expect(normalizeRouterTarget("/planejar", ""))
      .toBe("/planejar");
    expect(normalizeRouterTarget("/trajeto-web/trajeto-web-extra", "/trajeto-web"))
      .toBe("/trajeto-web/trajeto-web-extra");
  });
});
