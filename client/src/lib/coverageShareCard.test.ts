import { describe, expect, it } from "vitest";
import { buildCoverageShareCardSvg, coverageShareCardFilename } from "./coverageShareCard";

describe("coverage share card", () => {
  it("inclui cidade, fonte e contagem no cartão visual", () => {
    const svg = buildCoverageShareCardSvg({ city: "Águas Lindas", state: "GO", corridor: "BR-070", authorizedStations: 33, sourceDate: "19 ago. 2026", url: "https://exemplo.test/cobertura?cidade=aguas-lindas" });
    expect(svg).toContain("Águas Lindas");
    expect(svg).toContain("33");
    expect(coverageShareCardFilename("Águas Lindas")).toBe("trajeto-cobertura-aguas-lindas.svg");
  });
});
