import { describe, expect, it } from "vitest";
import { stationDataConfidence, stationDataConfidenceBand } from "./stationEntity";
import type { AnpStation } from "@shared/anpRevendedores";
import type { AnpPriceRecord } from "@shared/anpPrices";

const fresh = new Date().toISOString();
const stale = new Date(Date.now() - 400 * 86_400_000).toISOString();

const anp = (dataObtencao: string): AnpStation => ({
  cnpj: "00000000000000",
  codigoSimp: null,
  autorizacao: null,
  dataPublicacao: null,
  razaoSocial: "Posto Teste",
  endereco: null,
  complemento: null,
  bairro: null,
  cep: null,
  uf: "GO",
  municipio: "Águas Lindas de Goiás",
  distribuidora: null,
  dataVinculacao: null,
  latitude: -15.75,
  longitude: -48.26,
  latitudeAnp4c: null,
  longitudeAnp4c: null,
  validacao: null,
  estimativaAcuraciaM: null,
  srid: null,
  sistemaReferenciaCoordenadas: null,
  dataObtencao,
  origemInformacao: "ANP",
  situacaoConstatada: null,
  observacao: null,
  statusSigaf: null,
  src: null,
  inadimplenciaPMQC: null,
  products: [],
});

const price = (collectionDate: string): AnpPriceRecord => ({
  cnpj: "00000000000000",
  razaoSocial: "Posto Teste",
  endereco: null,
  bairro: null,
  municipio: "Águas Lindas de Goiás",
  uf: "GO",
  produto: "Gasolina comum",
  productKey: "gasolina-comum",
  salePrice: 6.5,
  unit: "L",
  collectionDate,
  referencePeriod: "semanal",
  source: "ANP",
});

describe("stationDataConfidence", () => {
  it("returns a numeric score and centralizes its band labels", () => {
    const score = stationDataConfidence({ anp: anp(fresh), price: price(fresh) });

    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThanOrEqual(90);
    expect(score).toBeLessThanOrEqual(100);
    expect(stationDataConfidenceBand(score)).toBe("Alta");
  });

  it("reduces confidence when the evidence is stale", () => {
    const current = stationDataConfidence({ anp: anp(fresh), price: price(fresh) });
    const old = stationDataConfidence({ anp: anp(stale), price: price(stale) });

    expect(old).toBeLessThan(current);
  });

  it("keeps the published score bands deterministic", () => {
    expect(stationDataConfidenceBand(0)).toBe("Baixa");
    expect(stationDataConfidenceBand(49)).toBe("Baixa");
    expect(stationDataConfidenceBand(50)).toBe("Parcial");
    expect(stationDataConfidenceBand(69)).toBe("Parcial");
    expect(stationDataConfidenceBand(70)).toBe("Boa");
    expect(stationDataConfidenceBand(89)).toBe("Boa");
    expect(stationDataConfidenceBand(90)).toBe("Alta");
    expect(stationDataConfidenceBand(100)).toBe("Alta");
  });
});
