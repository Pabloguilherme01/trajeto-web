import { describe, expect, it } from "vitest";
import { stationCatalogStatus, stationDataConfidence, stationEvidence } from "./stationEntity";

describe("stationEntity", () => {
  const anp = {
    cnpj: "12.345.678/0001-90",
    dataObtencao: "2026-09-30T07:00:00Z",
    latitude: -15.8,
    longitude: -48.2,
  } as any;

  const local = {
    verifiedAt: "2026-09-30T07:00:00Z",
    mapData: { observedAt: "2026-09-30T06:00:00Z", phone: "61999999999", hours: "24h" },
  } as any;

  const price = {
    collectionDate: "2026-09-26",
    salePrice: 6.78,
  } as any;

  it("classifica o catálogo sem transformar confiança em ranking", () => {
    expect(stationCatalogStatus(anp, local)).toBe("anp-map-reconciled");
    expect(stationDataConfidence({ anp, local, price })).toBeGreaterThan(80);
  });

  it("expõe fonte e data separadamente para cadastro, preço e mapa", () => {
    expect(stationEvidence({ anp, local, price })).toEqual([
      expect.objectContaining({ key: "cadastro", source: "ANP", at: anp.dataObtencao }),
      expect.objectContaining({ key: "preco", source: "ANP", at: price.collectionDate }),
      expect.objectContaining({ key: "mapa", source: "Mapa", at: local.mapData.observedAt }),
    ]);
  });
});
