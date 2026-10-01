import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("geolocation fallback copy", () => {
  it("does not leave location buttons silent when geolocation is unavailable", () => {
    const home = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
    const planner = readFileSync(new URL("./Planner.tsx", import.meta.url), "utf8");
    expect(home).toContain("Localização não disponível neste navegador. Digite sua origem para continuar.");
    expect(planner).toContain("Localização não disponível neste navegador. Digite a origem para continuar.");
  });
});
