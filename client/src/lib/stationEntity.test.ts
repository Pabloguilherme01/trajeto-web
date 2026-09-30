import { describe, expect, it } from "vitest";
import { stationEvidence } from "./stationEntity";

describe("stationEvidence", () => {
  it("separa fonte e data de cadastro, preço e mapa", () => {
    const result = stationEvidence({
      anp: { cnpj: "12.345.678/0001-90", dataObtencao: "2026-09-30T07:00:00Z" } as any,
      local: { verifiedAt: "2026-09-30T07:00:00Z", mapData: { observedAt: "2026-09-30T06:00:00Z" } } as any,
      price: { collectionDate: "2026-09-26" } as any,
    });

    expect(result).toEqual([
      expect.objectContaining({ key: "cadastro", source: "ANP", at: "2026-09-30T07:00:00Z" }),
      expect.objectContaining({ key: "preco", source: "ANP", at: "2026-09-26" }),
      expect.objectContaining({ key: "mapa", source: "Mapa", at: "2026-09-30T06:00:00Z" }),
    ]);
  });
});
