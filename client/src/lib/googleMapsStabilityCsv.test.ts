import { describe, expect, it } from "vitest";
import { buildGoogleMapsStabilityCsv, googleMapsStabilityCsvFilename } from "./googleMapsStabilityCsv";

describe("google maps stability csv", () => {
  it("exporta as métricas semanais com cabeçalho, período e valores ausentes explícitos", () => {
    const csv = buildGoogleMapsStabilityCsv([{ key: "2026-08-19", label: "ter", samples: 3, successRate: 67, p95Ms: 2_100, tokensWaiting: 1 }], new Date("2026-08-19T12:00:00.000Z"));
    expect(csv).toContain('"Data";"Dia";"Amostras";"Taxa de sucesso";"p95 (ms)";"Tokens em espera"');
    expect(csv).toContain('"2026-08-19";"ter";"3";"67%";"2100";"1"');
    expect(googleMapsStabilityCsvFilename(new Date("2026-08-19T12:00:00.000Z"))).toBe("trajeto-estabilidade-google-maps-2026-08-19.csv");
  });
});
