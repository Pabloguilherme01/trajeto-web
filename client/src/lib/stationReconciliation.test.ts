import { describe, expect, it } from "vitest";
import { dedupeStationReferences, stationReferencesMatch } from "./stationReconciliation";

describe("stationReconciliation", () => {
  it("prefers the strongest source and keeps one canonical station", () => {
    const refs = dedupeStationReferences([
      { name: "Posto Central", address: "Rua A, 100, Águas Lindas de Goiás", source: "Google", placeId: "google-1", lat: -15.75, lng: -48.28 },
      { name: "POSTO CENTRAL", address: "Rua A, 100, Águas Lindas de Goiás", source: "ANP", cnpj: "12345678000199", lat: -15.7501, lng: -48.2801 },
    ]);
    expect(refs).toHaveLength(1);
    expect(refs[0].source).toBe("ANP");
    expect(refs[0].placeId).toBe("google-1");
    expect(refs[0].cnpj).toBe("12345678000199");
  });

  it("matches close coordinates even with different names", () => {
    expect(stationReferencesMatch(
      { name: "Posto A", source: "ANP", lat: -15.75, lng: -48.28 },
      { name: "Posto B", source: "Google", lat: -15.7504, lng: -48.2801 },
    )).toBe(true);
  });

  it("does not merge unrelated references", () => {
    expect(stationReferencesMatch(
      { name: "Posto A", source: "ANP", address: "Rua A, 100" },
      { name: "Posto B", source: "Google", address: "Rua B, 900" },
    )).toBe(false);
  });
});
