import { describe, expect, it } from "vitest";
import { stationDataConfidence } from "./stationEntity";

describe("stationDataConfidence", () => {
  it("does not call ANP-only cadastro 100% complete", () => {
    expect(stationDataConfidence({ anp: {} as never })).toBe(35);
  });

  it("reaches 100% only when the relevant data dimensions are present", () => {
    expect(
      stationDataConfidence({
        anp: { latitude: -15.76, longitude: -48.24 } as never,
        local: {
          mapData: { phone: "6130000000", hours: "24h" },
          anp: { latitude: -15.76, longitude: -48.24 },
        } as never,
        price: { salePrice: 6.78 } as never,
      }),
    ).toBe(100);
  });

  it("uses partial credit for a map coordinate when ANP coordinates are absent", () => {
    expect(
      stationDataConfidence({
        anp: {} as never,
        local: {
          mapData: { observedAt: "2026-09-30T00:00:00Z" },
          anp: { latitude: -15.76, longitude: -48.24 },
        } as never,
      }),
    ).toBe(50);
  });
});
